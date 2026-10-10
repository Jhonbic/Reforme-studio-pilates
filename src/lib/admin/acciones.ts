"use server";

import { revalidatePath } from "next/cache";
import {
  CATEGORIAS_GASTO,
  MAX_COMPROBANTE,
  METODOS_PAGO,
  TIPOS_COMPROBANTE,
  TIPOS_IDENTIFICACION,
} from "./catalogos";
import { fecha as fechaCorta, moneda } from "./format";
import { hoyEnBogota } from "./horario";
import { getUsuarioActual } from "./queries";
import type {
  Asistencia,
  BorradorClase,
  BorradorPlan,
  CategoriaGasto,
  MetodoPago,
  RolEquipo,
  TipoClase,
  TipoIdentificacion,
} from "./types";
import { crearClienteAdmin } from "@/lib/supabase/admin";
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

/* ======================================================================
   Planes
   ====================================================================== */

export type ResultadoPlan =
  | { ok: true }
  | { ok: false; error: string; campo?: "nombre" | "clases" };

/** Las rutas que enseñan nombres o precios de planes. */
function revalidarPlanes() {
  revalidatePath("/admin/planes");
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin");
}

async function soloAdministracion(): Promise<string | null> {
  const usuario = await getUsuarioActual();
  return usuario?.rol === "Administración"
    ? null
    : "Solo Administración puede cambiar el catálogo de planes.";
}

/**
 * Crea un plan (`id` nulo) o guarda los cambios de uno existente.
 *
 * ⚠️ **Cambiar el precio NO cambia lo que pagó nadie**: cada membresía copia
 * su importe al contratarse (`membresias.importe`). El precio nuevo vale para
 * las altas y renovaciones de aquí en adelante.
 */
export async function guardarPlan(
  id: string | null,
  b: BorradorPlan,
): Promise<ResultadoPlan> {
  const prohibido = await soloAdministracion();
  if (prohibido) return { ok: false, error: prohibido };

  const nombre = b.nombre.trim();
  if (nombre.length < 3) return { ok: false, campo: "nombre", error: "El nombre necesita al menos 3 caracteres." };
  if (!Number.isInteger(b.precio) || b.precio <= 0) return { ok: false, error: "Precio no válido." };
  if (!Number.isInteger(b.vigenciaDias) || b.vigenciaDias <= 0) return { ok: false, error: "Vigencia no válida." };
  if (!["Mat", "Reformer", "Fusión"].includes(b.modalidad)) return { ok: false, error: "Modalidad no válida." };
  // Solo cuentan las bolsas de la modalidad: un plan Mat no trae Reformer.
  const reformer = b.modalidad === "Mat" ? 0 : b.clasesReformer;
  const mat = b.modalidad === "Reformer" ? 0 : b.clasesMat;
  const valida = (n: number) => Number.isInteger(n) && n > 0 && n <= 100;
  if ((b.modalidad !== "Mat" && !valida(reformer)) || (b.modalidad !== "Reformer" && !valida(mat)))
    return { ok: false, campo: "clases", error: "Indica cuántas clases trae de cada tipo (de 1 a 100)." };

  const fila = {
    nombre,
    precio: b.precio,
    vigencia_dias: b.vigenciaDias,
    modalidad: b.modalidad,
    clases_reformer: reformer,
    clases_mat: mat,
    se_vende: b.seVende,
    descripcion: b.descripcion.trim(),
    caracteristicas: b.caracteristicas.map((c) => c.trim()).filter(Boolean),
  };

  const supabase = await crearClienteServidor();
  const { error } = id
    ? await supabase.from("planes").update(fila).eq("id", id)
    : await supabase.from("planes").insert(fila);

  if (error) {
    // `nombre` es único: dos planes «Mensual» serían indistinguibles en el
    // listado de clientes, que enseña el plan por nombre.
    if (error.code === "23505") return { ok: false, campo: "nombre", error: "Ya hay un plan con ese nombre." };
    return { ok: false, error: `No se pudo guardar el plan: ${error.message}` };
  }

  revalidarPlanes();
  return { ok: true };
}

/**
 * Pone un plan a la venta o lo retira, sin tocar nada más.
 *
 * Es la alternativa a borrar: quien ya lo tiene lo conserva, pero deja de
 * ofrecerse.
 */
export async function cambiarVentaPlan(id: string, seVende: boolean): Promise<ResultadoPlan> {
  const prohibido = await soloAdministracion();
  if (prohibido) return { ok: false, error: prohibido };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("planes").update({ se_vende: seVende }).eq("id", id);
  if (error) return { ok: false, error: `No se pudo cambiar el plan: ${error.message}` };

  revalidarPlanes();
  return { ok: true };
}

/**
 * Borra un plan.
 *
 * ⚠️ La base NO deja borrar un plan que alguien haya contratado alguna vez
 * (`membresias.plan_id ... on delete restrict`): el historial de pagos de esa
 * persona lo necesita. No basta con que hoy no lo tenga nadie; cuenta el
 * pasado. Ese caso vuelve como un mensaje que propone retirarlo de la venta.
 */
export async function eliminarPlan(id: string): Promise<ResultadoPlan> {
  const prohibido = await soloAdministracion();
  if (prohibido) return { ok: false, error: prohibido };

  const supabase = await crearClienteServidor();
  const { error, count } = await supabase
    .from("planes")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return {
        ok: false,
        error: "No se puede eliminar: hay clientes que lo contrataron alguna vez y su historial lo necesita. Márcalo como «no se vende».",
      };
    }
    return { ok: false, error: `No se pudo eliminar el plan: ${error.message}` };
  }
  // Sin error y sin filas: RLS lo filtró o ya no existía. No es un éxito.
  if (count === 0) return { ok: false, error: "El plan ya no existe." };

  revalidarPlanes();
  return { ok: true };
}

/* ======================================================================
   Asignar plan y cobrar
   ====================================================================== */

export type ResultadoAsignacion =
  | { ok: true }
  | { ok: false; error: string };

const UUID_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Le asigna un plan a un cliente y registra el cobro: alta de su primer plan
 * o renovación, es la misma operación.
 *
 * Lo hace la función de base `registrar_membresia` (migración
 * `20261001150000`), en UNA transacción: membresía y pago entran juntos o no
 * entra ninguno. Allí se decide también la fecha de inicio (renovar antes de
 * tiempo no pisa los días ya pagados) y se copia el precio.
 *
 * Quién: Administración y Recepción (el mostrador). Se comprueba aquí para dar
 * un mensaje claro, y RLS lo vuelve a impedir dentro de la función.
 */
export async function asignarPlan(
  clienteId: string,
  planId: string,
  metodo: string,
  /** Lo que paga hoy. `null` = el plan entero; 0 = nada todavía. */
  abono: number | null = null,
): Promise<ResultadoAsignacion> {
  const usuario = await getUsuarioActual();
  if (usuario?.rol !== "Administración" && usuario?.rol !== "Recepción") {
    return { ok: false, error: "Tu rol no puede registrar cobros." };
  }
  if (!UUID_VALIDO.test(clienteId) || !UUID_VALIDO.test(planId)) {
    return { ok: false, error: "Cliente o plan no válido." };
  }
  if (!esMetodo(metodo)) return { ok: false, error: "Método de pago no válido." };
  if (abono !== null && (!Number.isInteger(abono) || abono < 0))
    return { ok: false, error: "Lo que paga hoy no es un importe válido." };

  const supabase = await crearClienteServidor();
  // El tope (no más que el precio) lo pone la función de la base.
  const { error } = await supabase.rpc("registrar_membresia", {
    p_cliente: clienteId,
    p_plan: planId,
    p_metodo: metodo,
    ...(abono === null ? {} : { p_abono: abono }),
  });

  if (error) {
    // Los `raise exception` de la función ya traen el mensaje para personas
    // («Ese plan ya no se vende.»); el resto, con su texto técnico.
    if (error.code === "P0001" || error.code === "P0002") return { ok: false, error: error.message };
    return { ok: false, error: `No se pudo registrar: ${error.message}` };
  }

  // Cambian la ficha, el listado (estado y vence), Finanzas (el cobro),
  // Planes (clientes por plan) y el dashboard.
  revalidatePath(`/admin/usuarios/${clienteId}`);
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/finanzas");
  revalidatePath("/admin/planes");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Cobra (todo o una parte) lo que falta de una membresía. La base no deja
 * cobrar más de lo que se debe (`pagos_no_superan_membresia`), tampoco si dos
 * personas cobran a la vez.
 */
export async function registrarPago(
  membresiaId: string,
  importe: number,
  metodo: string,
): Promise<ResultadoAsignacion> {
  const usuario = await getUsuarioActual();
  if (usuario?.rol !== "Administración" && usuario?.rol !== "Recepción") {
    return { ok: false, error: "Tu rol no puede registrar cobros." };
  }
  if (!UUID_VALIDO.test(membresiaId)) return { ok: false, error: "Membresía no válida." };
  if (!esMetodo(metodo)) return { ok: false, error: "Método de pago no válido." };
  if (!Number.isInteger(importe) || importe <= 0)
    return { ok: false, error: "Escribe cuánto paga." };

  const supabase = await crearClienteServidor();
  const { data: debe, error: errorDebe } = await supabase
    .from("membresias_pendientes")
    .select("cliente_id, pendiente")
    .eq("membresia_id", membresiaId)
    .maybeSingle();
  if (errorDebe) return { ok: false, error: `No se pudo comprobar la deuda: ${errorDebe.message}` };
  if (!debe?.cliente_id || !debe.pendiente) return { ok: false, error: "Esa membresía ya está pagada." };
  if (importe > debe.pendiente)
    return { ok: false, error: `Solo falta por cobrar ${moneda(debe.pendiente)}.` };

  const { error } = await supabase.from("pagos").insert({
    cliente_id: debe.cliente_id,
    membresia_id: membresiaId,
    metodo,
    fecha: hoyEnBogota(),
    importe,
  });
  if (error) {
    // Otra persona cobró entre medias: la base lo frena.
    if (error.code === "P0001")
      return { ok: false, error: "Alguien cobró a la vez: vuelve a abrir la ficha y mira lo que falta." };
    return { ok: false, error: `No se pudo registrar el pago: ${error.message}` };
  }
  revalidatePath(`/admin/usuarios/${debe.cliente_id}`);
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/finanzas");
  revalidatePath("/admin");
  return { ok: true };
}

/* ======================================================================
   Equipo y acceso al panel
   ====================================================================== */

const ROLES: RolEquipo[] = ["Administración", "Recepción", "Instructora"];
const esRol = (v: string): v is RolEquipo => (ROLES as string[]).includes(v);

export type ResultadoEquipo =
  | { ok: true; contrasena?: string; aviso?: string }
  | { ok: false; error: string; campo?: "correo" };

/**
 * Contraseña temporal de 12 caracteres, sin los que se confunden al dictarla
 * o copiarla a mano (0/O, 1/l/I). Con `crypto`, no `Math.random`: es una
 * credencial.
 */
function contrasenaTemporal(): string {
  const letras = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const azar = new Uint32Array(12);
  crypto.getRandomValues(azar);
  return Array.from(azar, (n) => letras[n % letras.length]).join("");
}

/** La sesión de Administración, o un error para devolver tal cual. */
async function adminActual(): Promise<{ id: string } | { error: string }> {
  const usuario = await getUsuarioActual();
  if (usuario?.rol !== "Administración") {
    return { error: "Solo Administración puede gestionar el equipo." };
  }
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getUser();
  return data.user ? { id: data.user.id } : { error: "Tu sesión caducó. Vuelve a entrar." };
}

/** Da de alta a una persona en el equipo, SIN acceso: eso es otro paso. */
export async function crearMiembro(datos: {
  nombre: string;
  correo: string;
  telefono: string;
  rol: string;
}): Promise<ResultadoEquipo> {
  const yo = await adminActual();
  if ("error" in yo) return { ok: false, error: yo.error };

  const nombre = datos.nombre.trim();
  const correo = datos.correo.trim().toLowerCase();
  if (nombre.length < 3) return { ok: false, error: "Falta el nombre." };
  if (!esCorreo(correo)) return { ok: false, campo: "correo", error: "Correo no válido." };
  if (datos.telefono && !esMovilCO(datos.telefono)) return { ok: false, error: "Teléfono no válido." };
  if (!esRol(datos.rol)) return { ok: false, error: "Rol no válido." };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("equipo").insert({
    nombre,
    correo,
    telefono: datos.telefono || null,
    rol: datos.rol,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, campo: "correo", error: "Ya hay alguien del equipo con ese correo." };
    return { ok: false, error: `No se pudo guardar: ${error.message}` };
  }
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

/**
 * Le da acceso al panel a alguien del equipo.
 *
 * - Si nunca tuvo cuenta: se le crea con una **contraseña temporal**, que se
 *   devuelve UNA vez para que Administración se la entregue en mano. No hay
 *   invitación por correo: el correo gratuito de Supabase solo llega a los
 *   miembros del proyecto de Supabase, no al personal del estudio.
 * - Si ya tuvo cuenta y se le quitó el acceso: se le devuelve el perfil, con
 *   la misma contraseña de antes.
 * - Si su correo ya tenía cuenta por otro camino: se enlaza a esa cuenta.
 *
 * Crear la cuenta exige la clave `service_role` (`crearClienteAdmin`); el
 * perfil y el enlace van con la sesión de Administración y RLS por delante.
 * Si algo falla después de crear la cuenta, la cuenta se borra: una cuenta
 * sin perfil no sirve y quedaría huérfana.
 */
export async function darAcceso(equipoId: string): Promise<ResultadoEquipo> {
  const yo = await adminActual();
  if ("error" in yo) return { ok: false, error: yo.error };

  const supabase = await crearClienteServidor();
  const { data: m } = await supabase
    .from("equipo")
    .select("id, nombre, correo, rol, cuenta_id, activo")
    .eq("id", equipoId)
    .maybeSingle();
  if (!m) return { ok: false, error: "Esa persona no está en el equipo." };
  if (!m.activo) return { ok: false, error: "Está marcada como inactiva: actívala antes de darle acceso." };

  // Ya tuvo cuenta: devolverle el perfil basta.
  if (m.cuenta_id) {
    const { error } = await supabase
      .from("perfiles")
      .upsert({ id: m.cuenta_id, nombre: m.nombre, rol: m.rol });
    if (error) return { ok: false, error: `No se pudo dar acceso: ${error.message}` };
    revalidatePath("/admin/usuarios");
    return { ok: true, aviso: "Ya tenía cuenta: entra con la contraseña de antes." };
  }

  const admin = crearClienteAdmin();
  if (!admin) {
    return {
      ok: false,
      error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor: sin ella no se pueden crear cuentas.",
    };
  }

  const contrasena = contrasenaTemporal();
  const creada = await admin.auth.admin.createUser({
    email: m.correo,
    password: contrasena,
    email_confirm: true,
    user_metadata: { nombre: m.nombre },
  });

  let cuentaId = creada.data.user?.id;
  let reutilizada = false;
  if (creada.error) {
    // El correo ya tenía cuenta (p. ej. se registró como cliente). Se busca
    // y se enlaza: es la misma persona, y su contraseña la conoce ella.
    if (creada.error.code !== "email_exists") {
      return { ok: false, error: `No se pudo crear la cuenta: ${creada.error.message}` };
    }
    for (let pagina = 1; pagina <= 20 && !cuentaId; pagina++) {
      const { data } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
      cuentaId = data?.users.find((u) => u.email?.toLowerCase() === m.correo.toLowerCase())?.id;
      if (!data || data.users.length < 200) break;
    }
    if (!cuentaId) return { ok: false, error: "Ese correo ya tiene cuenta, pero no se encontró." };
    reutilizada = true;
  }
  const id = cuentaId as string;

  const perfil = await supabase.from("perfiles").insert({ id, nombre: m.nombre, rol: m.rol });
  const enlace = perfil.error
    ? null
    : await supabase.from("equipo").update({ cuenta_id: id }).eq("id", m.id);

  if (perfil.error || enlace?.error) {
    if (!reutilizada) await admin.auth.admin.deleteUser(id);
    else await supabase.from("perfiles").delete().eq("id", id);
    return { ok: false, error: `No se pudo dar acceso: ${(perfil.error ?? enlace?.error)?.message}` };
  }

  revalidatePath("/admin/usuarios");
  return reutilizada
    ? { ok: true, aviso: "Ese correo ya tenía cuenta: entra con su contraseña de siempre." }
    : { ok: true, contrasena };
}

/**
 * Le quita el acceso al panel: borra su perfil. La cuenta se conserva, para
 * poder devolvérselo sin crear otra.
 *
 * ⚠️ Nadie se quita el acceso a sí mismo (desde el panel no se podría
 * deshacer), y el estudio no se queda sin Administración.
 */
export async function quitarAcceso(equipoId: string): Promise<ResultadoEquipo> {
  const yo = await adminActual();
  if ("error" in yo) return { ok: false, error: yo.error };

  const supabase = await crearClienteServidor();
  const { data: m } = await supabase
    .from("equipo")
    .select("cuenta_id, rol")
    .eq("id", equipoId)
    .maybeSingle();
  if (!m?.cuenta_id) return { ok: false, error: "Esa persona no tiene acceso." };
  if (m.cuenta_id === yo.id) return { ok: false, error: "No puedes quitarte el acceso a ti misma." };

  if (m.rol === "Administración") {
    const { count } = await supabase
      .from("perfiles")
      .select("id", { count: "exact", head: true })
      .eq("rol", "Administración")
      .neq("id", m.cuenta_id);
    if (!count) {
      return {
        ok: false,
        error: "Es la única cuenta de Administración: el estudio se quedaría sin nadie que gestione el panel.",
      };
    }
  }

  const { error } = await supabase.from("perfiles").delete().eq("id", m.cuenta_id);
  if (error) return { ok: false, error: `No se pudo quitar el acceso: ${error.message}` };
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

/** Cambia la contraseña de alguien del equipo por una temporal nueva (la
 *  olvidó, o se teme que otra persona la conozca). Se devuelve UNA vez. */
export async function nuevaContrasenaTemporal(equipoId: string): Promise<ResultadoEquipo> {
  const yo = await adminActual();
  if ("error" in yo) return { ok: false, error: yo.error };

  const supabase = await crearClienteServidor();
  const { data: m } = await supabase.from("equipo").select("cuenta_id").eq("id", equipoId).maybeSingle();
  if (!m?.cuenta_id) return { ok: false, error: "Esa persona no tiene cuenta." };
  if (m.cuenta_id === yo.id) return { ok: false, error: "Tu contraseña se cambia desde tu menú de cuenta." };

  const admin = crearClienteAdmin();
  if (!admin) return { ok: false, error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor." };

  const contrasena = contrasenaTemporal();
  const { error } = await admin.auth.admin.updateUserById(m.cuenta_id, { password: contrasena });
  if (error) return { ok: false, error: `No se pudo cambiar la contraseña: ${error.message}` };
  return { ok: true, contrasena };
}

/** Cambia el rol de alguien (puesto y permisos a la vez, función
 *  `cambiar_rol_equipo`). Nadie se cambia el suyo: se podría quitar a sí
 *  mismo el rol que le deja deshacerlo. */
export async function cambiarRol(equipoId: string, rol: string): Promise<ResultadoEquipo> {
  const yo = await adminActual();
  if ("error" in yo) return { ok: false, error: yo.error };
  if (!esRol(rol)) return { ok: false, error: "Rol no válido." };

  const supabase = await crearClienteServidor();
  const { data: m } = await supabase.from("equipo").select("cuenta_id").eq("id", equipoId).maybeSingle();
  if (m?.cuenta_id === yo.id) return { ok: false, error: "No puedes cambiarte el rol a ti misma." };

  const { error } = await supabase.rpc("cambiar_rol_equipo", { p_equipo: equipoId, p_rol: rol });
  if (error) {
    if (error.code === "P0001" || error.code === "P0002") return { ok: false, error: error.message };
    return { ok: false, error: `No se pudo cambiar el rol: ${error.message}` };
  }
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

/**
 * Cambia la contraseña de quien tiene la sesión abierta.
 *
 * ⚠️ Pide la ACTUAL y la comprueba antes de cambiarla: con una sesión olvidada
 * abierta en el ordenador de recepción, cualquiera podría cambiarla y dejar
 * fuera a su dueña.
 */
export async function cambiarMiContrasena(actual: string, nueva: string): Promise<ResultadoEquipo> {
  if (nueva.length < 8) return { ok: false, error: "La contraseña nueva necesita al menos 8 caracteres." };
  if (nueva === actual) return { ok: false, error: "La contraseña nueva es igual a la actual." };

  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) return { ok: false, error: "Tu sesión caducó. Vuelve a entrar." };

  const comprobacion = await supabase.auth.signInWithPassword({
    email: data.user.email,
    password: actual,
  });
  if (comprobacion.error) return { ok: false, error: "La contraseña actual no es correcta." };

  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) return { ok: false, error: `No se pudo cambiar: ${error.message}` };
  return { ok: true };
}

/* ======================================================================
   Agenda: clases y reservas
   ====================================================================== */

export type ResultadoClase =
  /** `resumen`: lo que pasó con una clase semanal («4 clases, hasta el 2 nov…»). */
  | { ok: true; resumen?: string }
  | { ok: false; error: string; campo?: "instructoraId" | "cupos" | "horaInicio" | "hasta" };

const TIPOS_CLASE: TipoClase[] = ["Reformer", "Mat", "Privada"];
const esTipoClase = (v: string): v is TipoClase => (TIPOS_CLASE as string[]).includes(v);

/** Programar y apuntar gente es del mostrador; las instructoras consultan. */
async function soloMostrador(): Promise<string | null> {
  const usuario = await getUsuarioActual();
  return usuario?.rol === "Administración" || usuario?.rol === "Recepción"
    ? null
    : "Solo Administración y Recepción pueden cambiar la agenda.";
}

function revalidarAgenda() {
  revalidatePath("/admin/clases");
  // El dashboard enseña las reservas por día de la semana.
  revalidatePath("/admin");
  // La ficha del cliente enseña su saldo y sus próximas clases.
  revalidatePath("/admin/usuarios", "layout");
}

/**
 * Traduce los errores de la base a frases. Los que importan los produce la
 * PROPIA base, no la app: así valen igual para quien llame a la API sin pasar
 * por el formulario.
 */
function errorDeClase(e: { code?: string; message: string }): ResultadoClase {
  // 23P01 = violación de una restricción de exclusión. Hay dos: sala y
  // instructora; el mensaje trae el nombre de la que saltó.
  if (e.code === "23P01" && e.message.includes("clases_sala_sin_solapes")) {
    return {
      ok: false,
      campo: "horaInicio",
      error: "Esa sala ya está ocupada a esa hora. Elige otra hora.",
    };
  }
  if (e.code === "23P01") {
    return {
      ok: false,
      campo: "instructoraId",
      error: "Esa instructora ya tiene otra clase que se pisa con este horario.",
    };
  }
  if (e.code === "P0001") return { ok: false, campo: "cupos", error: e.message };
  return { ok: false, error: `No se pudo guardar la clase: ${e.message}` };
}

/** Comprueba un borrador de clase. `null` si está bien. */
function errorDeBorrador(b: BorradorClase): ResultadoClase | null {
  if (!esTipoClase(b.tipo)) return { ok: false, error: "Tipo de clase no válido." };
  if (b.sala !== "Reformer" && b.sala !== "Mat") return { ok: false, error: "Sala no válida." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.fecha)) return { ok: false, error: "Fecha no válida." };
  if (!/^\d{2}:\d{2}$/.test(b.horaInicio)) return { ok: false, error: "Hora no válida." };
  if (!Number.isInteger(b.duracionMin) || b.duracionMin < 15 || b.duracionMin > 240)
    return { ok: false, error: "Duración no válida." };
  if (!UUID_VALIDO.test(b.instructoraId))
    return { ok: false, campo: "instructoraId", error: "Elige una instructora." };
  if (!Number.isInteger(b.cupos) || b.cupos <= 0)
    return { ok: false, campo: "cupos", error: "El aforo tiene que ser al menos 1." };
  // Programar en el pasado no tiene sentido; editar una clase que ya pasó,
  // tampoco (la pantalla ni siquiera ofrece el botón).
  if (b.fecha < hoyEnBogota()) return { ok: false, error: "La fecha ya pasó." };
  return null;
}

/** «4 clases», «1 clase». */
const clases_ = (n: number) => `${n} ${n === 1 ? "clase" : "clases"}`;

/**
 * Crea una clase (`id` nulo) o guarda los cambios de UNA clase.
 *
 * Con `hasta`, la clase nueva se repite cada semana (mismo día, hora y sala)
 * desde su fecha hasta ese día: lo hace `crear_clase_semanal` en la base, que
 * crea TODAS sus clases al momento y dice cuántas semanas no se pudieron (sala
 * o instructora ocupadas). Una privada no se repite.
 *
 * El solapamiento de instructora lo comprueba el formulario EN VIVO (para
 * avisar antes de pulsar) y lo impide la BASE (restricción de exclusión): el
 * formulario evita el error de quien lo usa, la base el de cualquiera.
 */
export async function guardarClase(
  id: string | null,
  b: BorradorClase,
  /** Último día de la serie: si llega, la clase se repite cada semana. */
  hasta: string | null = null,
): Promise<ResultadoClase> {
  const prohibido = await soloMostrador();
  if (prohibido) return { ok: false, error: prohibido };
  const invalido = errorDeBorrador(b);
  if (invalido) return invalido;

  if (hasta && !id) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(hasta)) return { ok: false, campo: "hasta", error: "Fecha de fin no válida." };
    if (b.tipo === "Privada") return { ok: false, error: "Una clase privada no se repite: prográmala día a día." };
    const supabase = await crearClienteServidor();
    const { data, error } = await supabase.rpc("crear_clase_semanal", {
      p_fecha: b.fecha,
      p_hora: b.horaInicio,
      p_sala: b.tipo,
      p_duracion: b.duracionMin,
      p_instructora: b.instructoraId,
      p_cupos: b.cupos,
      p_hasta: hasta,
    });
    if (error) {
      if (error.code === "P0001")
        return { ok: false, campo: /fin|año/.test(error.message) ? "hasta" : "horaInicio", error: error.message };
      return errorDeClase(error);
    }
    const r = data as { creadas: number; saltadas: number; hasta: string | null };
    revalidarAgenda();
    return {
      ok: true,
      resumen:
        `${clases_(r.creadas)} en la agenda` +
        (r.hasta ? `, la última el ${fechaCorta(r.hasta)}` : "") +
        (r.saltadas > 0
          ? `. ${r.saltadas === 1 ? "Una semana no se pudo" : `${r.saltadas} semanas no se pudieron`}: la sala o la instructora ya estaban ocupadas`
          : "") +
        ".",
    };
  }

  const fila = {
    tipo: b.tipo,
    // La base la fuerza para Reformer y Mat; solo cuenta en una privada.
    sala: b.sala,
    fecha: b.fecha,
    hora_inicio: b.horaInicio,
    duracion_min: b.duracionMin,
    instructora_id: b.instructoraId,
    cupos: b.cupos,
  };
  const supabase = await crearClienteServidor();
  const { error } = id
    ? await supabase.from("clases").update(fila).eq("id", id)
    : await supabase.from("clases").insert(fila);
  if (error) return errorDeClase(error);

  revalidarAgenda();
  return { ok: true };
}

/**
 * Cancela una clase: se queda en la agenda marcada «Cancelada», con sus
 * reservas, porque hay personas a las que avisar (el sistema no manda
 * mensajes todavía; hay que llamarlas).
 */
export async function cancelarClase(id: string): Promise<ResultadoClase> {
  const prohibido = await soloMostrador();
  if (prohibido) return { ok: false, error: prohibido };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("clases").update({ cancelada: true }).eq("id", id);
  if (error) return { ok: false, error: `No se pudo cancelar: ${error.message}` };
  revalidarAgenda();
  return { ok: true };
}

/**
 * Borra una clase. Solo si NADIE la reservó: con reservas, la base lo impide
 * (`reservas.clase_id ... on delete restrict`) y lo que toca es cancelarla.
 */
export async function eliminarClase(id: string): Promise<ResultadoClase> {
  const prohibido = await soloMostrador();
  if (prohibido) return { ok: false, error: prohibido };

  const supabase = await crearClienteServidor();
  const { error, count } = await supabase.from("clases").delete({ count: "exact" }).eq("id", id);
  if (error) {
    if (error.code === "23503") {
      return { ok: false, error: "Alguien la reservó mientras tanto: cancélala en vez de eliminarla." };
    }
    return { ok: false, error: `No se pudo eliminar: ${error.message}` };
  }
  if (count === 0) return { ok: false, error: "La clase ya no existe." };
  revalidarAgenda();
  return { ok: true };
}

/**
 * Apunta a un cliente a una clase. Hoy lo hace el mostrador; con el paso 10
 * lo harán también los propios clientes.
 *
 * El aforo lo vigila la BASE (trigger `reservas_respetan_aforo`, que bloquea
 * la clase mientras cuenta): dos recepcionistas apuntando a la vez al último
 * cupo no pueden colar a las dos personas.
 */
export async function reservar(claseId: string, clienteId: string): Promise<ResultadoClase> {
  const prohibido = await soloMostrador();
  if (prohibido) return { ok: false, error: prohibido };
  if (!UUID_VALIDO.test(claseId) || !UUID_VALIDO.test(clienteId))
    return { ok: false, error: "Clase o cliente no válido." };

  const supabase = await crearClienteServidor();
  const { data: clase } = await supabase
    .from("clases")
    .select("fecha, cancelada")
    .eq("id", claseId)
    .maybeSingle();
  if (!clase) return { ok: false, error: "La clase ya no existe." };
  if (clase.cancelada) return { ok: false, error: "La clase está cancelada." };
  if (clase.fecha < hoyEnBogota()) return { ok: false, error: "La clase ya pasó." };

  const { error } = await supabase.from("reservas").insert({ clase_id: claseId, cliente_id: clienteId });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ya estaba apuntada a esta clase." };
    if (error.code === "P0001") return { ok: false, error: error.message };
    return { ok: false, error: `No se pudo reservar: ${error.message}` };
  }
  revalidarAgenda();
  return { ok: true };
}

/**
 * Cuántas clases le quedan a cada cliente para el día y la modalidad de una
 * clase (`disponibles_para`). La pide el buscador de «Apuntar a» al abrirse:
 * así recepción ve «le quedan 2 de Mat» antes de pulsar, y no después del
 * error. Una privada no descuenta: devuelve `null`.
 */
export async function disponiblesParaClase(
  claseId: string,
): Promise<{ ok: true; disponibles: Record<string, number> | null } | { ok: false; error: string }> {
  const prohibido = await soloMostrador();
  if (prohibido) return { ok: false, error: prohibido };
  if (!UUID_VALIDO.test(claseId)) return { ok: false, error: "Clase no válida." };

  const supabase = await crearClienteServidor();
  const { data: clase } = await supabase.from("clases").select("fecha, tipo").eq("id", claseId).maybeSingle();
  if (!clase) return { ok: false, error: "La clase ya no existe." };
  if (clase.tipo === "Privada") return { ok: true, disponibles: null };

  const { data, error } = await supabase.rpc("disponibles_para", { p_fecha: clase.fecha, p_tipo: clase.tipo });
  if (error) return { ok: false, error: `No se pudo leer el saldo: ${error.message}` };
  return { ok: true, disponibles: Object.fromEntries(data.map((d) => [d.cliente_id, d.disponibles])) };
}

/**
 * Apunta a alguien a la lista de espera de una clase llena (recepción). Al
 * liberarse un cupo entra solo el primero que tenga clases en su plan
 * (`promover_lista_espera`).
 */
export async function apuntarListaEspera(claseId: string, clienteId: string): Promise<ResultadoClase> {
  const prohibido = await soloMostrador();
  if (prohibido) return { ok: false, error: prohibido };
  if (!UUID_VALIDO.test(claseId) || !UUID_VALIDO.test(clienteId))
    return { ok: false, error: "Clase o cliente no válido." };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("lista_espera").insert({ clase_id: claseId, cliente_id: clienteId });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ya estaba en la lista de espera." };
    return { ok: false, error: `No se pudo apuntar a la lista: ${error.message}` };
  }
  revalidarAgenda();
  return { ok: true };
}

export async function quitarDeListaEspera(id: string): Promise<ResultadoClase> {
  const prohibido = await soloMostrador();
  if (prohibido) return { ok: false, error: prohibido };
  if (!UUID_VALIDO.test(id)) return { ok: false, error: "No válido." };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("lista_espera").delete().eq("id", id);
  if (error) return { ok: false, error: `No se pudo quitar de la lista: ${error.message}` };
  revalidarAgenda();
  return { ok: true };
}

/** Mueve a alguien de una clase a otra en una transacción (`mover_reserva`). */
export async function moverReserva(reservaId: string, claseId: string): Promise<ResultadoClase> {
  const prohibido = await soloMostrador();
  if (prohibido) return { ok: false, error: prohibido };
  if (!UUID_VALIDO.test(reservaId) || !UUID_VALIDO.test(claseId)) return { ok: false, error: "No válido." };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("mover_reserva", { p_reserva: reservaId, p_clase: claseId });
  if (error) {
    if (error.code === "P0001" || error.code === "42501") return { ok: false, error: error.message };
    return { ok: false, error: `No se pudo mover: ${error.message}` };
  }
  revalidarAgenda();
  return { ok: true };
}

/** Quita una reserva y libera el cupo. */
export async function quitarReserva(reservaId: string): Promise<ResultadoClase> {
  const prohibido = await soloMostrador();
  if (prohibido) return { ok: false, error: prohibido };

  const supabase = await crearClienteServidor();
  const { error, count } = await supabase.from("reservas").delete({ count: "exact" }).eq("id", reservaId);
  if (error) return { ok: false, error: `No se pudo quitar la reserva: ${error.message}` };
  if (count === 0) return { ok: false, error: "Esa reserva ya no existe." };
  revalidarAgenda();
  return { ok: true };
}

/**
 * Marca «Asistió» / «No vino» en varias reservas de una clase (o las desmarca,
 * con `null`). Una sola acción para una reserva o para «el resto vinieron».
 *
 * ⚠️ El permiso NO se comprueba aquí con el rol: también marca la instructora
 * de ESA clase, y eso solo lo sabe la base. `marcar_asistencia` lo decide
 * (mostrador o instructora de la clase; clase empezada y no cancelada) y aquí
 * solo se traduce su respuesta.
 *
 * No toca el saldo: la clase se descontó al reservar, y faltar no la devuelve.
 */
export async function marcarAsistencia(
  reservaIds: string[],
  asistencia: Asistencia | null,
): Promise<ResultadoClase> {
  if (!(await getUsuarioActual())) return { ok: false, error: "Tu sesión se cerró: vuelve a entrar." };
  if (asistencia !== null && asistencia !== "Asistió" && asistencia !== "No vino")
    return { ok: false, error: "Valor de asistencia no válido." };
  if (reservaIds.length === 0 || reservaIds.length > 100 || !reservaIds.every((id) => UUID_VALIDO.test(id)))
    return { ok: false, error: "Reserva no válida." };

  const supabase = await crearClienteServidor();
  for (const id of reservaIds) {
    const { error } = await supabase.rpc("marcar_asistencia", {
      p_reserva: id,
      // El tipo generado no admite null, pero la función sí: es «desmarcar».
      p_asistencia: asistencia as Asistencia,
    });
    if (error) {
      if (error.code === "42501" || error.code === "P0001" || error.code === "P0002")
        return { ok: false, error: error.message };
      return { ok: false, error: `No se pudo marcar la asistencia: ${error.message}` };
    }
  }
  revalidarAgenda();
  // «Asistió» mueve la última asistencia, y con ella el estado «Inactiva».
  revalidatePath("/admin/usuarios", "layout");
  return { ok: true };
}

/* ======================================================================
   Configuración (solo Administración; RLS lo vuelve a impedir)
   ====================================================================== */

async function soloAdminConfig(): Promise<string | null> {
  const usuario = await getUsuarioActual();
  return usuario?.rol === "Administración" ? null : "Solo Administración cambia la configuración.";
}

function revalidarConfiguracion() {
  revalidatePath("/admin/configuracion");
  revalidatePath("/admin/clases", "layout");
  revalidatePath("/mi-cuenta");
}

type ResultadoConfig = { ok: true; aviso?: string } | { ok: false; error: string };

/** Semanas de agenda por delante y horas mínimas para cancelar. */
export async function guardarAjustes(semanas: number, horas: number): Promise<ResultadoConfig> {
  const prohibido = await soloAdminConfig();
  if (prohibido) return { ok: false, error: prohibido };
  if (!Number.isInteger(semanas) || semanas < 1 || semanas > 12)
    return { ok: false, error: "Las semanas van de 1 a 12." };
  if (!Number.isInteger(horas) || horas < 0 || horas > 72)
    return { ok: false, error: "Las horas van de 0 a 72." };

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("ajustes")
    .update({ semanas_por_delante: semanas, horas_para_cancelar: horas })
    .eq("id", true);
  if (error) return { ok: false, error: `No se pudo guardar: ${error.message}` };
  // Si se alargó la agenda, que se rellene ya y no mañana.
  const { error: errorAgenda } = await supabase.rpc("extender_agenda");
  revalidarConfiguracion();
  return errorAgenda
    ? { ok: true, aviso: `La agenda se rellenará esta noche (ahora no se pudo: ${errorAgenda.message}).` }
    : { ok: true };
}

/** La meta de clientes activos que enseña el dashboard. */
export async function guardarMeta(meta: number): Promise<ResultadoConfig> {
  const prohibido = await soloAdminConfig();
  if (prohibido) return { ok: false, error: prohibido };
  if (!Number.isInteger(meta) || meta < 1 || meta > 10000)
    return { ok: false, error: "La meta va de 1 a 10.000 clientes." };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("ajustes").update({ meta_clientes: meta }).eq("id", true);
  if (error) return { ok: false, error: `No se pudo guardar la meta: ${error.message}` };
  revalidatePath("/admin/configuracion");
  revalidatePath("/admin");
  return { ok: true };
}

/** Aforo de una sala. Sus próximas clases con el aforo de la sala lo siguen. */
export async function guardarAforoSala(sala: string, capacidad: number): Promise<ResultadoConfig> {
  const prohibido = await soloAdminConfig();
  if (prohibido) return { ok: false, error: prohibido };
  if (sala !== "Reformer" && sala !== "Mat") return { ok: false, error: "Sala no válida." };
  if (!Number.isInteger(capacidad) || capacidad < 1 || capacidad > 50)
    return { ok: false, error: "El aforo va de 1 a 50." };

  const supabase = await crearClienteServidor();
  const { error, count } = await supabase
    .from("salas")
    .update({ capacidad }, { count: "exact" })
    .eq("id", sala);
  if (error) return { ok: false, error: `No se pudo guardar el aforo: ${error.message}` };
  if (count === 0) return { ok: false, error: "Esa sala no existe." };

  // Al bajarlo, las clases con más gente apuntada se quedan como estaban.
  const { count: grandes } = await supabase
    .from("clases")
    .select("id", { count: "exact", head: true })
    .eq("sala", sala)
    .eq("cancelada", false)
    .gte("fecha", hoyEnBogota())
    .gt("cupos", capacidad);
  revalidarConfiguracion();
  return grandes
    ? {
        ok: true,
        aviso: `${grandes} ${grandes === 1 ? "clase próxima tiene" : "clases próximas tienen"} más cupos que el aforo nuevo (por la gente ya apuntada o porque se pusieron a mano): revísalas en la agenda.`,
      }
    : { ok: true };
}

/** Cierra un día: la agenda quita sus clases sin reservas y no crea más. */
export async function cerrarDia(fecha: string, motivo: string): Promise<ResultadoConfig> {
  const prohibido = await soloAdminConfig();
  if (prohibido) return { ok: false, error: prohibido };
  const texto = motivo.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, error: "Elige el día." };
  if (fecha < hoyEnBogota()) return { ok: false, error: "Ese día ya pasó." };
  if (!texto || texto.length > 80) return { ok: false, error: "Escribe el motivo (hasta 80 letras)." };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("dias_cerrados").insert({ fecha, motivo: texto });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ese día ya está cerrado." };
    return { ok: false, error: `No se pudo cerrar el día: ${error.message}` };
  }
  const { count } = await supabase
    .from("clases")
    .select("id", { count: "exact", head: true })
    .eq("fecha", fecha)
    .eq("cancelada", false);
  revalidarConfiguracion();
  return count
    ? {
        ok: true,
        aviso: `${count} ${count === 1 ? "clase de ese día tenía" : "clases de ese día tenían"} reservas y se ${count === 1 ? "queda" : "quedan"}: cancélalas en la agenda y avisa a quienes reservaron.`,
      }
    : { ok: true };
}

/** Vuelve a abrir un día cerrado: la agenda recupera sus clases del horario. */
export async function abrirDia(fecha: string): Promise<ResultadoConfig> {
  const prohibido = await soloAdminConfig();
  if (prohibido) return { ok: false, error: prohibido };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, error: "Día no válido." };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("dias_cerrados").delete().eq("fecha", fecha);
  if (error) return { ok: false, error: `No se pudo abrir el día: ${error.message}` };
  revalidarConfiguracion();
  return { ok: true };
}

/* ======================================================================
   Clases semanales («todos los lunes a las 07:00»)
   ====================================================================== */

/**
 * Cambia quién da, cuánto dura, cuántos caben y HASTA CUÁNDO llega una serie,
 * en todas sus próximas clases. Día, hora y sala no: eso es otra serie (se
 * quita esta y se crea la nueva). Alargarla crea las clases nuevas al momento;
 * acortarla quita las que sobran (las reservadas quedan canceladas). Las que
 * no admiten el cambio se quedan como estaban y el resumen lo dice.
 */
export async function editarClaseSemanal(
  franjaId: string,
  b: BorradorClase,
  hasta: string,
): Promise<ResultadoClase> {
  const prohibido = await soloMostrador();
  if (prohibido) return { ok: false, error: prohibido };
  if (!UUID_VALIDO.test(franjaId)) return { ok: false, error: "Clase semanal no válida." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hasta)) return { ok: false, campo: "hasta", error: "Fecha de fin no válida." };
  const invalido = errorDeBorrador(b);
  if (invalido) return invalido;

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("editar_clase_semanal", {
    p_franja: franjaId,
    p_instructora: b.instructoraId,
    p_duracion: b.duracionMin,
    p_cupos: b.cupos,
    p_hasta: hasta,
  });
  if (error) {
    if (error.code === "P0001" && /fin|año/.test(error.message))
      return { ok: false, campo: "hasta", error: error.message };
    return { ok: false, error: error.message };
  }
  const r = data as {
    cambiadas: number;
    sin_cambiar: number;
    creadas: number;
    quitadas: number;
    canceladas: number;
    hasta: string | null;
  };
  revalidarAgenda();
  const partes = [`${clases_(r.cambiadas)} al día`];
  if (r.creadas > 0) partes.push(`${clases_(r.creadas)} ${r.creadas === 1 ? "nueva" : "nuevas"}`);
  if (r.quitadas > 0) partes.push(`${clases_(r.quitadas)} ${r.quitadas === 1 ? "quitada" : "quitadas"}`);
  if (r.canceladas > 0)
    partes.push(`${clases_(r.canceladas)} con reservas ${r.canceladas === 1 ? "cancelada" : "canceladas"} (avisa a esas personas)`);
  return {
    ok: true,
    resumen:
      partes.join(", ") +
      (r.hasta ? `. La última, el ${fechaCorta(r.hasta)}` : "") +
      (r.sin_cambiar > 0
        ? `. ${clases_(r.sin_cambiar)} no se ${r.sin_cambiar === 1 ? "pudo" : "pudieron"} cambiar (la instructora ya tenía otra a esa hora, o hay más reservas que cupos): ${r.sin_cambiar === 1 ? "se queda" : "se quedan"} como ${r.sin_cambiar === 1 ? "estaba" : "estaban"}`
        : ""),
  };
}

/**
 * Deja de repetir una clase: borra las próximas que nadie reservó y cancela
 * las que tienen gente (se quedan «Canceladas» para saber a quién avisar).
 */
export async function quitarClaseSemanal(franjaId: string): Promise<ResultadoClase> {
  const prohibido = await soloMostrador();
  if (prohibido) return { ok: false, error: prohibido };
  if (!UUID_VALIDO.test(franjaId)) return { ok: false, error: "Clase semanal no válida." };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("quitar_clase_semanal", { p_franja: franjaId });
  if (error) return { ok: false, error: error.message };
  const r = data as { borradas: number; canceladas: number };
  revalidarAgenda();
  return {
    ok: true,
    resumen:
      `${clases_(r.borradas)} ${r.borradas === 1 ? "quitada" : "quitadas"} de la agenda` +
      (r.canceladas > 0
        ? `. ${clases_(r.canceladas)} con reservas ${r.canceladas === 1 ? "quedó cancelada" : "quedaron canceladas"}: avisa a esas personas`
        : ""),
  };
}

/* ======================================================================
   Acceso a la web de un cliente que ya existe
   ====================================================================== */

/**
 * Le da acceso a `/mi-cuenta` a un cliente que dio de alta recepción, con una
 * contraseña temporal que se enseña UNA vez (mismo mecanismo que el equipo).
 * Si ya tenía cuenta, le genera otra contraseña temporal (la olvidó).
 *
 * ⚠️ Es el ÚNICO camino para que un cliente que ya existe entre a la web: el
 * registro libre no enlaza una cédula existente a una cuenta nueva, porque sin
 * verificar el correo cualquiera podría quedarse con la ficha de otro.
 * Recepción, en cambio, tiene a la persona delante.
 *
 * Usa el mismo correo de la ficha como usuario: sin correo no se puede.
 */
export async function accesoWebCliente(clienteId: string): Promise<ResultadoEquipo> {
  const usuario = await getUsuarioActual();
  if (usuario?.rol !== "Administración" && usuario?.rol !== "Recepción") {
    return { ok: false, error: "Solo Administración y Recepción pueden dar acceso a la web." };
  }
  if (!UUID_VALIDO.test(clienteId)) return { ok: false, error: "Cliente no válido." };

  const admin = crearClienteAdmin();
  if (!admin) return { ok: false, error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor." };

  const supabase = await crearClienteServidor();
  const { data: c } = await supabase
    .from("clientes")
    .select("id, nombre, correo, cuenta_id")
    .eq("id", clienteId)
    .maybeSingle();
  if (!c) return { ok: false, error: "Ese cliente no existe." };

  const contrasena = contrasenaTemporal();

  if (c.cuenta_id) {
    const { error } = await admin.auth.admin.updateUserById(c.cuenta_id, { password: contrasena });
    if (error) return { ok: false, error: `No se pudo cambiar la contraseña: ${error.message}` };
    return { ok: true, contrasena };
  }

  if (!c.correo) {
    return { ok: false, error: "Su ficha no tiene correo, y el correo es su usuario. Añádeselo antes." };
  }

  const creada = await admin.auth.admin.createUser({
    email: c.correo,
    password: contrasena,
    email_confirm: true,
    user_metadata: { nombre: c.nombre },
  });
  if (creada.error || !creada.data.user) {
    // Ese correo ya es una cuenta (de otra ficha, o del equipo): no se enlaza
    // a ciegas.
    if (creada.error?.code === "email_exists") {
      return { ok: false, error: "Ese correo ya tiene una cuenta. Revisa que la ficha tenga el correo correcto." };
    }
    return { ok: false, error: `No se pudo crear la cuenta: ${creada.error?.message}` };
  }

  const { error } = await supabase
    .from("clientes")
    .update({ cuenta_id: creada.data.user.id })
    .eq("id", c.id);
  if (error) {
    await admin.auth.admin.deleteUser(creada.data.user.id);
    return { ok: false, error: `No se pudo dar acceso: ${error.message}` };
  }

  revalidatePath(`/admin/usuarios/${c.id}`);
  return { ok: true, contrasena };
}
