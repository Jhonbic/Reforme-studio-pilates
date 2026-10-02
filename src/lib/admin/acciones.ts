"use server";

import { revalidatePath } from "next/cache";
import { TIPOS_IDENTIFICACION } from "./catalogos";
import { hoyEnBogota } from "./horario";
import { getUsuarioActual } from "./queries";
import type { TipoIdentificacion } from "./types";
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
