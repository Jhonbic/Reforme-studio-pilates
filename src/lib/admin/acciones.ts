"use server";

import { revalidatePath } from "next/cache";
import {
  MAX_COMPROBANTE,
  TIPOS_COMPROBANTE,
  TIPOS_IDENTIFICACION,
} from "./catalogos";
import { hoyEnBogota } from "./horario";
import { getUsuarioActual } from "./queries";
import type { CategoriaGasto, MetodoPago, TipoIdentificacion } from "./types";
import { crearClienteServidor } from "@/lib/supabase/server";
import { MAYORIA_DE_EDAD, edad, esCorreo, esMovilCO } from "@/lib/validacion";

/**
 * Lo que el formulario de alta manda al servidor.
 *
 * ⚠️ **Teléfonos en dígitos crudos** («3209078814»), no formateados. La base
 * solo acepta ese formato (`check (telefono ~ '^3\d{9}$')`); «+57 320 907
 * 8814» lo rechazaría. El formato es cosa de la pantalla.
 */
export type AltaCliente = {
  nombre: string;
  tipoIdentificacion: TipoIdentificacion;
  identificacion: string;
  fechaNacimiento: string;
  telefono: string;
  /** Cadena vacía si no lo dio. */
  correo: string;
  eps: string;
  emergenciaNombre: string;
  emergenciaTelefono: string;
  /** Solo si es menor de edad. */
  acudiente?: { nombre: string; identificacion: string; telefono: string };
  aceptaTerminos: boolean;
};

export type ResultadoAlta =
  | { ok: true; id: string }
  | { ok: false; error: string; campo?: "identificacion" };

/**
 * El primer problema que se encuentre, o `null`.
 *
 * ⚠️ **Se vuelve a validar TODO aunque el formulario ya lo haya hecho.** Una
 * server action es un endpoint público: cualquiera puede llamarla con lo que
 * quiera, sin pasar por el formulario. Los mensajes son cortos a propósito:
 * con el formulario de por medio no deberían verse nunca.
 */
function problemaDe(a: AltaCliente, hoy: string): string | null {
  if (a.nombre.trim().length < 3) return "Falta el nombre.";
  if (!TIPOS_IDENTIFICACION.includes(a.tipoIdentificacion))
    return "Tipo de documento no válido.";
  if (!/^[A-Z0-9]{4,15}$/.test(a.identificacion))
    return "Número de documento no válido.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.fechaNacimiento) || a.fechaNacimiento > hoy)
    return "Fecha de nacimiento no válida.";
  if (!esMovilCO(a.telefono)) return "Teléfono no válido.";
  if (a.correo && !esCorreo(a.correo)) return "Correo no válido.";
  if (!a.eps.trim()) return "Falta la EPS.";
  if (a.emergenciaNombre.trim().length < 3)
    return "Falta el contacto de emergencia.";
  if (!esMovilCO(a.emergenciaTelefono))
    return "Teléfono de emergencia no válido.";

  // La minoría de edad se decide AQUÍ, con la fecha del servidor, y no se
  // cree la del navegador: si no, bastaría con no mandar acudiente.
  const anios = edad(a.fechaNacimiento, hoy);
  if (anios !== null && anios < MAYORIA_DE_EDAD) {
    const t = a.acudiente;
    if (!t || t.nombre.trim().length < 3 || !t.identificacion || !esMovilCO(t.telefono))
      return "Un menor necesita los datos de su acudiente.";
  }

  if (!a.aceptaTerminos) return "Faltan los términos y condiciones.";
  return null;
}

/**
 * Da de alta a un cliente. **Sin plan**: se le asigna después (decisión del
 * usuario), así que sale en el listado como «Sin plan» hasta entonces.
 *
 * Quién puede: Administración y Recepción. Lo comprueba aquí para dar un
 * mensaje claro, y lo vuelve a impedir RLS (`es_mostrador()`) aunque esta
 * comprobación fallara.
 */
export async function crearCliente(a: AltaCliente): Promise<ResultadoAlta> {
  const usuario = await getUsuarioActual();
  if (usuario?.rol !== "Administración" && usuario?.rol !== "Recepción") {
    return { ok: false, error: "Tu rol no puede dar de alta clientes." };
  }

  const problema = problemaDe(a, hoyEnBogota());
  if (problema) return { ok: false, error: problema };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("clientes")
    .insert({
      nombre: a.nombre.trim(),
      tipo_identificacion: a.tipoIdentificacion,
      identificacion: a.identificacion,
      fecha_nacimiento: a.fechaNacimiento,
      telefono: a.telefono,
      correo: a.correo.trim().toLowerCase() || null,
      eps: a.eps.trim(),
      emergencia_nombre: a.emergenciaNombre.trim(),
      emergencia_telefono: a.emergenciaTelefono,
      acudiente_nombre: a.acudiente?.nombre.trim() ?? null,
      acudiente_identificacion: a.acudiente?.identificacion ?? null,
      acudiente_telefono: a.acudiente?.telefono ?? null,
      acepta_terminos: a.aceptaTerminos,
    })
    .select("id")
    .single();

  if (error) {
    // 23505 = clave única. El formulario ya avisa de documentos repetidos,
    // pero con la lista que había al ABRIR la página: otra recepcionista
    // pudo dar de alta a la misma persona entre medias.
    if (error.code === "23505") {
      return {
        ok: false,
        campo: "identificacion",
        error: "Ya hay un cliente con ese tipo y número de documento.",
      };
    }
    return { ok: false, error: `No se pudo guardar: ${error.message}` };
  }

  // El listado, la ficha y el dashboard se pintan en el servidor: sin esto
  // seguirían enseñando la versión de antes del alta.
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin");
  return { ok: true, id: data.id };
}

/* ======================================================================
   Gastos
   ====================================================================== */

const CATEGORIAS_GASTO: CategoriaGasto[] = [
  "Arriendo",
  "Nómina",
  "Servicios",
  "Mantenimiento",
  "Marketing",
];
const METODOS_PAGO: MetodoPago[] = ["Efectivo", "Nequi", "Transferencia", "Tarjeta"];

/* Guardas de tipo: lo que llega en un `FormData` es texto cualquiera, y así
   el `insert` recibe el tipo del enum sin forzarlo con `as`. */
const esCategoria = (v: string): v is CategoriaGasto =>
  (CATEGORIAS_GASTO as string[]).includes(v);
const esMetodo = (v: string): v is MetodoPago =>
  (METODOS_PAGO as string[]).includes(v);

export type ResultadoGasto = { ok: true } | { ok: false; error: string };

/**
 * Registra un gasto, con su comprobante si lo hay.
 *
 * Llega como `FormData` y no como objeto porque trae un archivo: los `File`
 * solo cruzan a una server action dentro de un `FormData`.
 *
 * Solo Administración (RLS: `gastos` y el bucket `comprobantes` son de ese
 * rol). El archivo se sube PRIMERO y, si luego falla el `insert`, se borra:
 * un comprobante sin gasto es un archivo huérfano que nadie encontraría.
 *
 * ⚠️ El comprobante se guarda como RUTA dentro del bucket, no como URL: el
 * bucket es privado y las URL firmadas caducan.
 */
export async function registrarGasto(datos: FormData): Promise<ResultadoGasto> {
  const usuario = await getUsuarioActual();
  if (usuario?.rol !== "Administración") {
    return { ok: false, error: "Solo Administración puede registrar gastos." };
  }

  const categoria = String(datos.get("categoria") ?? "");
  const concepto = String(datos.get("concepto") ?? "").trim();
  const importe = Number(datos.get("importe"));
  const fecha = String(datos.get("fecha") ?? "");
  const metodo = String(datos.get("metodo") ?? "");
  const archivo = datos.get("comprobante");

  if (!esCategoria(categoria)) return { ok: false, error: "Categoría no válida." };
  if (concepto.length < 3) return { ok: false, error: "Falta el concepto." };
  if (!Number.isInteger(importe) || importe <= 0) return { ok: false, error: "Importe no válido." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha > hoyEnBogota())
    return { ok: false, error: "La fecha no puede ser posterior a hoy." };
  if (!esMetodo(metodo)) return { ok: false, error: "Método de pago no válido." };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let ruta: string | null = null;
  if (archivo instanceof File && archivo.size > 0) {
    if (!TIPOS_COMPROBANTE.includes(archivo.type))
      return { ok: false, error: "El comprobante tiene que ser una foto o un PDF." };
    if (archivo.size > MAX_COMPROBANTE)
      return { ok: false, error: "El comprobante pasa de 3,5 MB." };

    // Por año y mes para que el bucket se pueda recorrer a mano; el nombre es
    // aleatorio para que dos facturas «factura.pdf» no se pisen.
    const ext = archivo.name.split(".").pop()?.toLowerCase() || "bin";
    ruta = `${fecha.slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
    const subida = await supabase.storage
      .from("comprobantes")
      .upload(ruta, archivo, { contentType: archivo.type });
    if (subida.error) return { ok: false, error: `No se pudo subir el comprobante: ${subida.error.message}` };
  }

  const { error } = await supabase.from("gastos").insert({
    categoria,
    concepto,
    importe,
    fecha,
    metodo,
    comprobante_path: ruta,
    registrado_por: user?.id ?? null,
  });

  if (error) {
    if (ruta) await supabase.storage.from("comprobantes").remove([ruta]);
    return { ok: false, error: `No se pudo guardar el gasto: ${error.message}` };
  }

  revalidatePath("/admin/finanzas");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Enlace temporal (60 s) para ver el comprobante de un gasto.
 *
 * Se pide al pulsar «Ver comprobante» y no al cargar el libro: firmar una URL
 * por fila en cada carga sería un viaje al servidor de Storage por gasto, y
 * caducarían antes de que nadie las usara. RLS del bucket: solo Administración.
 */
export async function urlComprobante(gastoId: string): Promise<string | null> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("gastos")
    .select("comprobante_path")
    .eq("id", gastoId)
    .maybeSingle();
  if (!data?.comprobante_path) return null;

  const firmada = await supabase.storage
    .from("comprobantes")
    .createSignedUrl(data.comprobante_path, 60);
  return firmada.data?.signedUrl ?? null;
}
