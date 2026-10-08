import { cache } from "react";
import { finDe, hoyEnBogota, sumarDias } from "@/lib/admin/horario";
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
  /** Clases que le quedan HOY de cada tipo, sumando las membresías que cubren
   *  hoy. Solo los tipos que su plan trae (un plan Mat no dice «0 Reformer»).
   *  Vacío si hoy no tiene plan. */
  saldo: { tipo: "Reformer" | "Mat"; quedan: number; total: number }[];
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

  const [vigente, membresias, saldos] = await Promise.all([
    supabase.from("clientes_vigentes").select("plan, vencimiento, estado").eq("id", ficha.id).maybeSingle(),
    supabase.from("membresias").select("inicio, vencimiento").eq("cliente_id", ficha.id),
    supabase.rpc("saldo_clases", { p_cliente: ficha.id }),
  ]);

  // La cuenta de hoy: las membresías que cubren hoy (puede haber dos si
  // renovó antes de tiempo y la nueva ya empezó).
  const hoy = hoyEnBogota();
  const deHoy = (saldos.data ?? []).filter((m) => m.inicio <= hoy && hoy <= m.vencimiento);
  const suma = (f: (m: (typeof deHoy)[number]) => number) => deHoy.reduce((t, m) => t + f(m), 0);
  const saldo = (
    [
      { tipo: "Reformer", total: suma((m) => m.clases_reformer), usadas: suma((m) => m.usadas_reformer) },
      { tipo: "Mat", total: suma((m) => m.clases_mat), usadas: suma((m) => m.usadas_mat) },
    ] as const
  )
    .filter((s) => s.total > 0)
    .map((s) => ({ tipo: s.tipo, total: s.total, quedan: Math.max(0, s.total - s.usadas) }));

  return {
    id: ficha.id,
    nombre: ficha.nombre,
    correo: ficha.correo ?? user.email ?? "",
    plan: vigente.data?.plan ?? null,
    vencimiento: vigente.data?.vencimiento ?? null,
    estado: vigente.data?.estado ?? "Sin plan",
    cobertura: membresias.data ?? [],
    saldo,
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
  /** Clases de ese tipo que le quedan para la fecha de la clase. `null` en
   *  las Privadas, que no descuentan de ningún plan. */
  disponibles: number | null;
  /** Su puesto en la lista de espera (1 = la siguiente), o `null` si no espera. */
  puestoEspera: number | null;
};

/** El plazo para cancelar (Configuración). `ajustes` lo lee cualquier sesión. */
export async function getHorasParaCancelar(): Promise<number> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("ajustes").select("horas_para_cancelar").single();
  if (error) throw new Error(`No se pudieron leer los ajustes: ${error.message}`);
  return data.horas_para_cancelar;
}

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
      disponibles: c.tipo === "Privada" ? null : c.disponibles,
      puestoEspera: c.puesto_espera ?? null,
    };
  });
}
