"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { BorradorPlan, Resultado } from "@/lib/admin/types";

/**
 * Las cuatro escrituras del catálogo de planes.
 *
 * ⚠️ **La seguridad no está aquí, está en RLS.** Estas funciones usan la clave
 * anónima y la sesión de quien llama, así que la policy «planes: escritura de
 * Administración» decide si la escritura ocurre. Una recepcionista puede
 * invocarlas —son endpoints, cualquiera con la sesión puede— y la base se lo
 * negará igual. Por eso ninguna comprueba el rol por su cuenta: dos sitios
 * decidiendo lo mismo acaban discrepando.
 */

/** Lo que Postgres devuelve cuando algo falla. */
type ErrorPg = { code?: string; message: string };

/**
 * Traduce el error de Postgres a algo que se pueda leer en pantalla.
 *
 * ⚠️ Sin esto, al usuario le llegaría «duplicate key value violates unique
 * constraint "planes_nombre_key"», que no le dice qué hacer. Cada código que se
 * traduce aquí corresponde a una regla real del esquema.
 */
function traducir(error: ErrorPg, accion: "guardar" | "eliminar"): string {
  switch (error.code) {
    case "23505":
      // unique_violation — `nombre` es la única columna única de la tabla.
      return "Ya existe un plan con ese nombre. Los nombres no se pueden repetir.";

    case "23503":
      /* foreign_key_violation — `membresias.plan_id` es `on delete restrict`.
         Es la razón de ser de ese `restrict`: un plan contratado no se borra,
         porque se llevaría por delante el historial de quien lo pagó. */
      return (
        "No se puede eliminar: hay clientes con este plan contratado. " +
        "Márcalo como «no se vende» para retirarlo del catálogo sin perder su historial."
      );

    case "23514":
      // check_violation — precio > 0, vigencia > 0, clases > 0, nombre ≥ 3.
      return "Hay un dato fuera de rango. Revisa el precio, la vigencia y las clases incluidas.";

    case "42501":
      // insufficient_privilege — RLS rechazó la escritura.
      return "Tu cuenta no tiene permiso para esto. Hace falta el rol Administración.";

    default:
      return `No se pudo ${accion} el plan: ${error.message}`;
  }
}

/**
 * El mensaje de cuando la consulta va bien pero no toca ninguna fila.
 *
 * ⚠️ **Un UPDATE o un DELETE bloqueado por RLS NO devuelve error**: devuelve
 * éxito habiendo afectado a cero filas. Si no se comprobara, la pantalla diría
 * «Plan actualizado» y al recargar no habría cambiado nada — el peor fallo
 * posible, porque *parece* que funciona. De ahí el `.select()` en las dos.
 */
const NINGUNA_FILA =
  "No se aplicó ningún cambio: o el plan ya no existe, o tu cuenta no tiene " +
  "permiso (hace falta el rol Administración).";

/** `BorradorPlan` → las columnas de la tabla. */
function aFila(borrador: BorradorPlan) {
  return {
    nombre: borrador.nombre.trim(),
    precio: borrador.precio,
    vigencia_dias: borrador.vigenciaDias,
    clases_incluidas: borrador.clasesIncluidas,
    se_vende: borrador.seVende,
    descripcion: borrador.descripcion.trim(),
    caracteristicas: borrador.caracteristicas,
  };
}

/** Refresca la pantalla del catálogo tras escribir. */
function refrescar() {
  revalidatePath("/admin/planes");
}

export async function crearPlan(borrador: BorradorPlan): Promise<Resultado> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase
    .from("planes")
    .insert(aFila(borrador))
    .select("id")
    .single();

  if (error) return { ok: false, mensaje: traducir(error, "guardar") };

  /* El destacado va en una llamada aparte porque no es una columna que se pueda
     escribir sin más: marcar uno obliga a desmarcar el resto, y eso lo hace la
     función `destacar_plan` en una sola sentencia. */
  if (borrador.destacado && data) {
    const fallo = await aplicarDestacado(data.id);
    if (fallo) return fallo;
  }

  refrescar();
  return { ok: true };
}

export async function actualizarPlan(
  id: string,
  borrador: BorradorPlan,
): Promise<Resultado> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase
    .from("planes")
    .update(aFila(borrador))
    .eq("id", id)
    .select("id");

  if (error) return { ok: false, mensaje: traducir(error, "guardar") };
  if (!data || data.length === 0) return { ok: false, mensaje: NINGUNA_FILA };

  /* Al desmarcar, se pasa `null`: eso deja el catálogo sin ninguno destacado,
     que es un estado legítimo. Ver `destacar_plan` en la migración. */
  const fallo = await aplicarDestacado(borrador.destacado ? id : null);
  if (fallo) return fallo;

  refrescar();
  return { ok: true };
}

export async function eliminarPlan(id: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase
    .from("planes")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) return { ok: false, mensaje: traducir(error, "eliminar") };
  if (!data || data.length === 0) return { ok: false, mensaje: NINGUNA_FILA };

  refrescar();
  return { ok: true };
}

/**
 * Destaca un plan y desmarca el resto. Con `null`, deja el catálogo sin ninguno.
 *
 * Llama a la función `destacar_plan` de la base, que lo resuelve en **una sola
 * sentencia**: hacerlo con dos updates desde aquí podría dejar dos destacados
 * —o ninguno— si el segundo fallara.
 *
 * No se exporta como acción propia porque no hay ningún control que destaque
 * sin editar: se marca desde la casilla del formulario. Devuelve el fallo si lo
 * hubo, o `null` si fue bien.
 */
async function aplicarDestacado(
  id: string | null,
): Promise<{ ok: false; mensaje: string } | null> {
  const supabase = await crearClienteServidor();
  // Sin `id`, el argumento se omite y la función aplica su `default null`: el
  // catálogo se queda sin destacado. (El tipo generado no admite `null` literal.)
  const { error } = await supabase.rpc("destacar_plan", {
    plan_id: id ?? undefined,
  });

  return error ? { ok: false, mensaje: traducir(error, "guardar") } : null;
}
