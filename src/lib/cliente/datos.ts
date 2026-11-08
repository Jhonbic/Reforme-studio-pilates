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
  /** Ids de los planes de TODAS sus membresías (repetidos incluidos): decide
   *  si tiene derecho al descuento de apertura (`tieneDerechoApertura`). */
  planesComprados: string[];
  /** Primer día de la membresía que cuenta (la de hoy o, si aún no ha
   *  empezado, la próxima). Con él la tarjeta del plan dice «Empieza el…» y
   *  pinta cuánto lleva consumido. `null` sin plan. */
  inicio: string | null;
  /** Clases que le quedan de cada tipo, sumando las membresías que cubren
   *  hoy; si hoy no le cubre ninguna pero tiene una por empezar, las de esa
   *  (pagó un plan que empieza el lunes: ya sabe con cuántas cuenta). Solo
   *  los tipos que su plan trae (un plan Mat no dice «0 Reformer»). */
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
    supabase.from("membresias").select("inicio, vencimiento, plan_id").eq("cliente_id", ficha.id),
    supabase.rpc("saldo_clases", { p_cliente: ficha.id }),
  ]);

  // La cuenta de hoy: las membresías que cubren hoy (puede haber dos si
  // renovó antes de tiempo y la nueva ya empezó). Si ninguna cubre hoy, la
  // próxima que empieza: sin esto, quien pagó un plan que arranca el lunes
  // veía «Vigente hasta…» sin ninguna clase.
  const hoy = hoyEnBogota();
  const todas = saldos.data ?? [];
  const deHoy = todas.filter((m) => m.inicio <= hoy && hoy <= m.vencimiento);
  const proxima = todas
    .filter((m) => m.inicio > hoy)
    .sort((a, b) => a.inicio.localeCompare(b.inicio))[0];
  const cuentan = deHoy.length > 0 ? deHoy : proxima ? [proxima] : [];
  const suma = (f: (m: (typeof cuentan)[number]) => number) => cuentan.reduce((t, m) => t + f(m), 0);
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
    inicio: cuentan.length > 0 ? cuentan.map((m) => m.inicio).sort()[0] : null,
    cobertura: (membresias.data ?? []).map((m) => ({ inicio: m.inicio, vencimiento: m.vencimiento })),
    planesComprados: (membresias.data ?? []).map((m) => m.plan_id),
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

/** Lo que el cliente ve de su propia ficha en «Mi cuenta». */
export type MisDatos = {
  nombre: string;
  documento: string;
  correo: string | null;
  telefono: string | null;
  fechaNacimiento: string | null;
  direccion: string | null;
  eps: string | null;
  emergenciaNombre: string | null;
  emergenciaTelefono: string | null;
  /** Solo si es menor: lo dio de alta con su acudiente. */
  acudienteNombre: string | null;
  acudienteTelefono: string | null;
  alta: string;
};

/**
 * Su ficha, con su sesión (RLS solo le deja leer la suya). Los de contacto
 * los corrige él mismo en «Mi perfil» (`guardarMisDatos`); el resto,
 * recepción, que comprueba quién es.
 */
export async function getMisDatos(): Promise<MisDatos | null> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("clientes")
    .select(
      "nombre, tipo_identificacion, identificacion, correo, telefono, fecha_nacimiento, direccion, eps, emergencia_nombre, emergencia_telefono, acudiente_nombre, acudiente_telefono, alta",
    )
    .eq("cuenta_id", user.id)
    .maybeSingle();
  if (!data) return null;
  return {
    nombre: data.nombre,
    documento: `${data.tipo_identificacion} ${data.identificacion}`,
    correo: data.correo,
    telefono: data.telefono,
    fechaNacimiento: data.fecha_nacimiento,
    direccion: data.direccion,
    eps: data.eps,
    emergenciaNombre: data.emergencia_nombre,
    emergenciaTelefono: data.emergencia_telefono,
    acudienteNombre: data.acudiente_nombre,
    acudienteTelefono: data.acudiente_telefono,
    alta: data.alta,
  };
}

/** Una clase a la que ya fue (o que ya empezó), para el calendario «Tus clases». */
export type ClasePasada = {
  fecha: string;
  horaInicio: string;
  tipo: TipoClase;
  instructora: string;
  /** `null` = nadie pasó lista. */
  asistencia: "Asistió" | "No vino" | null;
  /** La canceló el estudio: no cuenta como tomada. */
  cancelada: boolean;
};

/**
 * Sus clases ya empezadas entre dos fechas (`mi_historial`, solo las suyas).
 *
 * ⚠️ No lanza: el historial es un adorno del Inicio, y si la base aún no tiene
 * la migración (o falla) el Inicio se pinta igual, con el calendario vacío.
 */
export async function getMiHistorial(desde: string, hasta: string): Promise<ClasePasada[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("mi_historial", { p_desde: desde, p_hasta: hasta });
  if (error) {
    console.error(`No se pudo leer el historial del cliente: ${error.message}`);
    return [];
  }
  return data.map((c) => ({
    fecha: c.fecha,
    horaInicio: c.hora_inicio.slice(0, 5),
    tipo: c.tipo,
    instructora: c.instructora,
    asistencia: c.asistencia,
    cancelada: c.cancelada,
  }));
}
