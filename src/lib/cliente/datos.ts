import { cache } from "react";
import { finDe, sumarDias } from "@/lib/admin/horario";
import type { EstadoMembresia, TipoClase } from "@/lib/admin/types";
import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * Datos del área de cliente (`/mi-cuenta`).
 *
 * Todo con la sesión del propio cliente: RLS solo le deja leer SU ficha, SUS
 * membresías y SUS reservas (migración `20261002130000`). La agenda llega por
 * la función `agenda_cliente`, que no expone ni el equipo ni a los demás
 * clientes. Es una capa aparte de `lib/admin/queries.ts` a propósito: el panel
 * y el área de cliente son dos productos con dos permisos distintos.
 */

export type MiCuenta = {
  id: string;
  nombre: string;
  correo: string;
  /** Plan de la última membresía, o `null` si nunca tuvo. */
  plan: string | null;
  vencimiento: string | null;
  estado: EstadoMembresia;
  /** Tramos que cubren sus membresías: para saber, antes de pulsar, qué
   *  días puede reservar (la regla de verdad está en la base). */
  cobertura: { inicio: string; vencimiento: string }[];
};

/**
 * El cliente que tiene la sesión, o `null` si quien entra no es un cliente
 * (personal del estudio, o nadie). `cache` porque la piden el layout y la
 * página en el mismo render.
 */
export const getMiCuenta = cache(async (): Promise<MiCuenta | null> => {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: ficha } = await supabase
    .from("clientes")
    .select("id, nombre, correo")
    .eq("cuenta_id", user.id)
    .maybeSingle();
  if (!ficha) return null;

  const [vigente, membresias] = await Promise.all([
    supabase.from("clientes_vigentes").select("plan, vencimiento, estado").eq("id", ficha.id).maybeSingle(),
    supabase.from("membresias").select("inicio, vencimiento").eq("cliente_id", ficha.id),
  ]);

  return {
    id: ficha.id,
    nombre: ficha.nombre,
    correo: ficha.correo ?? user.email ?? "",
    plan: vigente.data?.plan ?? null,
    vencimiento: vigente.data?.vencimiento ?? null,
    estado: vigente.data?.estado ?? "Sin plan",
    cobertura: membresias.data ?? [],
  };
});

export type ClaseParaCliente = {
  id: string;
  tipo: TipoClase;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  instructora: string;
  libres: number;
  reservada: boolean;
};

/** Días de agenda que se enseñan: dos semanas. La función de la base corta en
 *  cuatro, por si un día se amplía. */
export const DIAS_AGENDA_CLIENTE = 14;

/** Clases futuras y no canceladas de los próximos días, con si ya la tiene. */
export async function getAgendaCliente(hoy: string): Promise<ClaseParaCliente[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("agenda_cliente", {
    p_desde: hoy,
    p_hasta: sumarDias(hoy, DIAS_AGENDA_CLIENTE),
  });
  if (error) throw new Error(`No se pudo leer la agenda: ${error.message}`);

  return data.map((c) => {
    const horaInicio = c.hora_inicio.slice(0, 5);
    return {
      id: c.id,
      tipo: c.tipo,
      fecha: c.fecha,
      horaInicio,
      horaFin: finDe(horaInicio, c.duracion_min),
      instructora: c.instructora,
      libres: Math.max(0, c.cupos - c.reservas),
      reservada: c.reservada,
    };
  });
}
