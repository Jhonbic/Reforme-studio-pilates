import { calcularVariacion, moneda } from "./format";
import { diasEntre, lunesDe, sumarDias } from "./horario";
import { MESES_LARGOS, enPeriodo, esteMes, etiquetaPeriodo, periodoAnterior, type Periodo } from "./periodo";
import type {
  ClaseEnAgenda,
  EstadoMembresia,
} from "./types";
import { edad } from "../validacion";

/**
 * El Dashboard calculado a partir de las filas de la base.
 *
 * Funciones PURAS: reciben filas y `hoy`, devuelven cifras. No saben nada de
 * Supabase (eso es `getDatosDashboard()` en `queries.ts`), así que se pueden
 * probar con datos a mano y comparar contra un cálculo SQL independiente.
 *
 * ⚠️ **Desde oct 2026 el dashboard no tiene dinero** (estructura tomada de
 * JainSportBox, decisión del usuario): responde a «¿a quién atiendo hoy?» y
 * «¿cómo van las clases?». Lo financiero vive entero en Finanzas, que tiene
 * su propio selector de periodo.
 *
 * ⚠️ **Excepción del paso 6 (lista del estudio, oct 2026)**: el estudio SÍ
 * quiere ver aquí la meta de clientes, los ingresos del mes y lo que falta
 * por cobrar. Son tres cifras, sin gráficas (nada de ingresos frente a
 * gastos). Los ingresos, solo Administración; lo pendiente, el mostrador, que
 * es quien cobra.
 */

/** Una fila de `clientes_vigentes` más la fecha de nacimiento de `clientes`. */
export type ClienteResumen = {
  id: string;
  nombre: string;
  /** Dígitos crudos («3209078814»), o `null` si no lo dio. */
  telefono: string | null;
  plan: string | null;
  estado: EstadoMembresia | null;
  /** Vencimiento de la ÚLTIMA membresía. */
  vencimiento: string | null;
  nacimiento: string | null;
};

export type DatosDashboard = {
  clientes: ClienteResumen[];
  membresias: { clienteId: string; inicio: string; vencimiento: string }[];
};

/** Horizonte de «por vencer»: una semana, el plazo en el que todavía da
 *  tiempo a escribir antes de que se caiga la membresía. */
export const DIAS_POR_VENCER = 7;

/** Ventana de «recuperables», de la tasa de renovación y de la ocupación. */
export const VENTANA = 30;

const MESES_CORTOS = MESES_LARGOS.map((m) => m[0].toUpperCase() + m.slice(1, 3));

const suma = <T>(filas: T[], valor: (f: T) => number) =>
  filas.reduce((t, f) => t + valor(f), 0);

/** Ids de los clientes con una membresía que cubre ese día. Es la definición
 *  de «activo». */
export function activosEl(dia: string, membresias: DatosDashboard["membresias"]): Set<string> {
  const ids = new Set<string>();
  for (const m of membresias) {
    if (m.inicio <= dia && dia <= m.vencimiento) ids.add(m.clienteId);
  }
  return ids;
}

const vigentesEl = (dia: string, membresias: DatosDashboard["membresias"]) =>
  activosEl(dia, membresias).size;

function ultimos(dias: number, hoy: string): Periodo {
  return { desde: sumarDias(hoy, -(dias - 1)), hasta: hoy };
}

/** Por orden alfabético, con la colación española («Álvaro» antes que «Zoe»). */
const porNombre = (a: { nombre: string }, b: { nombre: string }) =>
  a.nombre.localeCompare(b.nombre, "es");

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

/**
 * Las cuatro cifras de la pestaña Clientes, las mismas que JainSportBox:
 *
 * - **Activos**: membresía vigente hoy (los inactivos cuentan: tienen el plan
 *   pagado). Se compara con hace 30 días en NÚMERO de clientes, no en %: con
 *   veinte clientes, «+5 %» es una persona y se lee como mucho más.
 * - **Sin plan**: fichas sin ninguna membresía. Es el «pendiente de activar»
 *   de Jain: alguien se registró en la web o en recepción y aún no paga. Es
 *   trabajo del día, no una alarma.
 * - **Recuperables**: su última membresía venció hace menos de 30 días. Aún
 *   se acuerdan del estudio; pasado un mes, ya es captar de nuevo.
 * - **Renovación**: ver `tasaRenovacion()`.
 */
export function resumenClientes(d: DatosDashboard, hoy: string) {
  const desdeRecuperable = sumarDias(hoy, -VENTANA);
  return {
    activos: vigentesEl(hoy, d.membresias),
    activosHace30: vigentesEl(sumarDias(hoy, -VENTANA), d.membresias),
    sinPlan: d.clientes.filter((c) => c.estado === "Sin plan").length,
    recuperables: d.clientes.filter(
      (c) =>
        c.estado === "Vencida" &&
        c.vencimiento !== null &&
        c.vencimiento >= desdeRecuperable,
    ).length,
    renovacion: tasaRenovacion(d, hoy),
  };
}

export type PorVencer = {
  id: string;
  nombre: string;
  telefono: string | null;
  plan: string;
  vencimiento: string;
  /** 0 = vence hoy. */
  dias: number;
};

/**
 * A quién escribir esta semana: su última membresía vence entre hoy y dentro
 * de `DIAS_POR_VENCER` días. Quien ya renovó no sale, porque su ÚLTIMA
 * membresía es la nueva. Primero lo más urgente.
 */
export function porVencer(d: DatosDashboard, hoy: string): PorVencer[] {
  const limite = sumarDias(hoy, DIAS_POR_VENCER);
  return d.clientes
    .filter(
      (c) =>
        c.vencimiento !== null &&
        c.estado !== "Vencida" &&
        c.vencimiento >= hoy &&
        c.vencimiento <= limite,
    )
    .map((c) => ({
      id: c.id,
      nombre: c.nombre,
      telefono: c.telefono,
      plan: c.plan ?? "",
      vencimiento: c.vencimiento as string,
      dias: diasEntre(hoy, c.vencimiento as string),
    }))
    .sort((a, b) => a.dias - b.dias || porNombre(a, b));
}

export type Cumpleanos = {
  id: string;
  nombre: string;
  telefono: string | null;
  /** Los que cumple hoy. */
  edad: number | null;
};

/**
 * Quién cumple años HOY. En un estudio premium, felicitar a tiempo es parte
 * del servicio; un día tarde ya es un trámite.
 *
 * ⚠️ Quien nació un 29 de febrero lo celebra el 28 en los años no bisiestos:
 * si no, tres de cada cuatro años no saldría nunca.
 */
export function cumpleanosDeHoy(d: DatosDashboard, hoy: string): Cumpleanos[] {
  const mmdd = hoy.slice(5);
  const anio = Number(hoy.slice(0, 4));
  const bisiesto = (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
  return d.clientes
    .filter((c) => {
      if (!c.nacimiento) return false;
      const suyo = c.nacimiento.slice(5);
      return suyo === mmdd || (!bisiesto && suyo === "02-29" && mmdd === "02-28");
    })
    .map((c) => ({
      id: c.id,
      nombre: c.nombre,
      telefono: c.telefono,
      edad: edad(c.nacimiento as string, hoy),
    }))
    .sort(porNombre);
}

/**
 * Clientes activos al cierre de cada uno de los últimos doce meses (el mes en
 * curso, a hoy). Sale de las membresías, así que se puede reconstruir para
 * cualquier fecha pasada.
 *
 * ⚠️ Los doce salen siempre: quitar un mes a cero haría que la línea uniera
 * dos meses no consecutivos como si fueran seguidos.
 */
export function activosPorMes(d: DatosDashboard, hoy: string) {
  let anio = Number(hoy.slice(0, 4));
  let mes = Number(hoy.slice(5, 7)) - 1;
  const serie: { mes: string; anio: number; activos: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const primero = `${anio}-${String(mes + 1).padStart(2, "0")}-01`;
    const ultimo = sumarDias(
      mes === 11 ? `${anio + 1}-01-01` : `${anio}-${String(mes + 2).padStart(2, "0")}-01`,
      -1,
    );
    const dia = ultimo < hoy ? ultimo : hoy;
    serie.unshift({
      mes: MESES_CORTOS[mes],
      anio,
      activos: primero <= hoy ? vigentesEl(dia, d.membresias) : 0,
    });
    [anio, mes] = mes === 0 ? [anio - 1, 11] : [anio, mes - 1];
  }
  return serie;
}

/**
 * De las membresías que vencieron en una ventana, qué parte se renovó: el
 * mismo cliente tiene otra membresía que empieza después.
 *
 * `null` si en la ventana no venció ninguna: sin vencimientos la pregunta no
 * aplica, y eso no es «0 %» (que sería «nadie renovó»).
 */
function tasaEn(v: Periodo, membresias: DatosDashboard["membresias"]) {
  const vencidas = membresias.filter((m) => enPeriodo(m.vencimiento, v));
  const renovadas = vencidas.filter((m) =>
    membresias.some((o) => o.clienteId === m.clienteId && o.inicio > m.inicio),
  );
  return {
    vencieron: vencidas.length,
    renovaron: renovadas.length,
    tasa: vencidas.length ? (renovadas.length / vencidas.length) * 100 : null,
  };
}

/** Tasa de renovación de los últimos 30 días (sin hoy: lo que vence hoy aún
 *  puede renovarse), frente a los 30 anteriores. La variación va en PUNTOS. */
export function tasaRenovacion(d: Pick<DatosDashboard, "membresias">, hoy: string) {
  const ayer = sumarDias(hoy, -1);
  const v = ultimos(VENTANA, ayer);
  const previa = ultimos(VENTANA, sumarDias(v.desde, -1));
  const actual = tasaEn(v, d.membresias);
  const anterior = tasaEn(previa, d.membresias).tasa;
  return {
    valor: actual.tasa,
    variacion: actual.tasa !== null && anterior !== null ? actual.tasa - anterior : null,
    /** «3 de 4 · últimos 30 días», como lo dice JainSportBox. */
    vencieron: actual.vencieron,
    renovaron: actual.renovaron,
  };
}

// ---------------------------------------------------------------------------
// Clases
// ---------------------------------------------------------------------------

/**
 * Las cuatro cifras de la pestaña Clases, las mismas que la pestaña
 * «Asistencia» de JainSportBox: hoy, esta semana, promedio diario y
 * participación.
 *
 * ⚠️ Son RESERVAS, no asistencias: todavía no existe el registro de quién
 * vino. Jain cuenta entradas al box; aquí se cuenta quién apartó cupo.
 */
export function resumenClases(clases: ClaseEnAgenda[], hoy: string, activos: Set<string>) {
  const activas = clases.filter((c) => !c.cancelada);
  const reservasDe = (filas: ClaseEnAgenda[]) => suma(filas, (c) => c.reservas);

  const lunes = lunesDe(hoy);
  const domingo = sumarDias(lunes, 6);
  const semana = activas.filter((c) => c.fecha >= lunes && c.fecha <= domingo);

  // Promedio de lo que YA pasó, por día con clases: un domingo cerrado no es
  // un día con cero reservas, es un día que no cuenta.
  const desde = sumarDias(hoy, -VENTANA);
  const pasadas = activas.filter((c) => c.fecha >= desde && c.fecha < hoy);
  const dias = new Set(pasadas.map((c) => c.fecha)).size;

  // ⚠️ Solo los ACTIVOS que reservaron: el mostrador puede apuntar a alguien
  // sin plan vigente (con aviso), y contarlo daba participaciones de «125 %».
  const personasSemana = new Set(
    semana.flatMap((c) => c.reservados.map((r) => r.clienteId)).filter((id) => activos.has(id)),
  ).size;

  return {
    hoy: reservasDe(activas.filter((c) => c.fecha === hoy)),
    semana: reservasDe(semana),
    /** `null` sin días con clases: la pregunta no aplica. */
    promedioDiario: dias ? Math.round(reservasDe(pasadas) / dias) : null,
    personasSemana,
    /** De los clientes activos, qué parte reservó esta semana. */
    participacion: activos.size ? Math.round((personasSemana / activos.size) * 100) : null,
  };
}

// ---------------------------------------------------------------------------
// Campana
// ---------------------------------------------------------------------------

/** El primer aviso de la campana: las mismas personas que «Por vencer». */
export function avisoPorVencer(
  d: { vigentes: { vencimiento: string | null; importeRenovacion: number }[] },
  hoy: string,
) {
  const limite = sumarDias(hoy, DIAS_POR_VENCER);
  const lista = d.vigentes.filter(
    (v) => v.vencimiento !== null && v.vencimiento >= hoy && v.vencimiento <= limite,
  );
  return {
    cuantos: lista.length,
    importe: moneda(suma(lista, (v) => v.importeRenovacion)),
  };
}

// ---------------------------------------------------------------------------
// Meta, ingresos y pendientes (paso 6)
// ---------------------------------------------------------------------------

/** Cuántos clientes activos hay frente a la meta del estudio. */
export function avanceMeta(activos: number, meta: number) {
  return {
    activos,
    meta,
    faltan: Math.max(0, meta - activos),
    /** Para la barra: nunca pasa de 100 aunque se supere la meta. */
    porcentaje: meta > 0 ? Math.min(100, Math.round((activos / meta) * 100)) : 0,
  };
}

/**
 * Lo cobrado este mes (del 1 a hoy) frente al MISMO TRAMO del anterior, como
 * Finanzas: el día 3 se compara con el 1–3 del mes pasado, no con el mes
 * entero (daría siempre un desplome).
 */
export function ingresosDelMes(pagos: { fecha: string; importe: number }[], hoy: string) {
  const actual = esteMes(hoy);
  const anterior = periodoAnterior(actual);
  const delMes = pagos.filter((p) => enPeriodo(p.fecha, actual));
  const total = suma(delMes, (p) => p.importe);
  const antes = suma(pagos.filter((p) => enPeriodo(p.fecha, anterior)), (p) => p.importe);
  return {
    total,
    cobros: delMes.length,
    anterior: antes,
    variacion: calcularVariacion(total, antes),
    etiquetaAnterior: etiquetaPeriodo(anterior, hoy),
  };
}
