import { moneda } from "./format";
import { diasEntre, lunesDe, sumarDias } from "./horario";
import { MESES_LARGOS, enPeriodo, type Periodo } from "./periodo";
import type {
  CategoriaGasto,
  ClaseEnAgenda,
  EstadoMembresia,
  MesFinanciero,
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
 * su propio selector de periodo. De paso, el dashboard es el mismo para todo
 * el equipo: ya no hay tarjetas que esconder a quien RLS no le da los pagos.
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

/** Clientes con una membresía que cubre ese día. Es la definición de «activo». */
function vigentesEl(dia: string, membresias: DatosDashboard["membresias"]): number {
  const ids = new Set<string>();
  for (const m of membresias) {
    if (m.inicio <= dia && dia <= m.vencimiento) ids.add(m.clienteId);
  }
  return ids.size;
}

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
function tasaEn(v: Periodo, membresias: DatosDashboard["membresias"]): number | null {
  const vencidas = membresias.filter((m) => enPeriodo(m.vencimiento, v));
  if (vencidas.length === 0) return null;
  const renovadas = vencidas.filter((m) =>
    membresias.some((o) => o.clienteId === m.clienteId && o.inicio > m.inicio),
  );
  return (renovadas.length / vencidas.length) * 100;
}

/** Tasa de renovación de los últimos 30 días (sin hoy: lo que vence hoy aún
 *  puede renovarse), frente a los 30 anteriores. La variación va en PUNTOS. */
export function tasaRenovacion(d: Pick<DatosDashboard, "membresias">, hoy: string) {
  const ayer = sumarDias(hoy, -1);
  const v = ultimos(VENTANA, ayer);
  const previa = ultimos(VENTANA, sumarDias(v.desde, -1));
  const valor = tasaEn(v, d.membresias);
  const anterior = tasaEn(previa, d.membresias);
  return {
    valor,
    variacion: valor !== null && anterior !== null ? valor - anterior : null,
  };
}

// ---------------------------------------------------------------------------
// Clases
// ---------------------------------------------------------------------------

/**
 * Las cifras y listas de la pestaña Clases. Recibe la agenda ya resuelta
 * (`getClases()`): así el estado de cada clase es el mismo que en la agenda.
 *
 * ⚠️ Son RESERVAS, no asistencias: todavía no existe el registro de quién
 * vino. Por eso se habla de «ocupación» y nunca de «asistencia».
 */
export function resumenClases(clases: ClaseEnAgenda[], hoy: string) {
  const activas = clases.filter((c) => !c.cancelada);

  const deHoy = clases
    .filter((c) => c.fecha === hoy)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  const hoyActivas = deHoy.filter((c) => !c.cancelada);

  const lunes = lunesDe(hoy);
  const semana = activas.filter((c) => c.fecha >= lunes && c.fecha <= sumarDias(lunes, 6));

  // Ocupación de lo que YA pasó: con las futuras dentro, una clase de mañana
  // a medio reservar bajaría la cifra solo por ser de mañana.
  const pasadas = activas.filter(
    (c) => c.fecha >= sumarDias(hoy, -VENTANA) && c.estado === "Finalizada",
  );
  const reservasPasadas = suma(pasadas, (c) => c.reservas);
  const cuposPasados = suma(pasadas, (c) => c.cupos);

  return {
    hoy: {
      clases: hoyActivas.length,
      reservas: suma(hoyActivas, (c) => c.reservas),
      cupos: suma(hoyActivas, (c) => c.cupos),
    },
    semana: {
      clases: semana.length,
      reservas: suma(semana, (c) => c.reservas),
      cupos: suma(semana, (c) => c.cupos),
    },
    /** `null` sin clases pasadas: la pregunta no aplica, no es «0 %». */
    ocupacion30: cuposPasados ? (reservasPasadas / cuposPasados) * 100 : null,
    promedio30: pasadas.length ? reservasPasadas / pasadas.length : null,
    deHoy,
    /** Llenas en los próximos 7 días: la señal de dónde hace falta otra clase. */
    llenas: activas
      .filter(
        (c) => c.estado === "Llena" && c.fecha >= hoy && c.fecha <= sumarDias(hoy, DIAS_POR_VENCER),
      )
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio)),
  };
}

// ---------------------------------------------------------------------------
// Finanzas y campana
// ---------------------------------------------------------------------------

/**
 * Los últimos doce meses, el en curso incluido, con ingresos y gastos. La usa
 * Finanzas para la tendencia del año.
 *
 * ⚠️ **Salen los doce aunque alguno esté a cero.** Un mes sin datos es
 * información («no se cobró nada»), y quitarlo haría que la gráfica uniera dos
 * meses no consecutivos como si fueran seguidos.
 */
export function serieMensual(
  d: {
    pagos: { fecha: string; importe: number }[];
    gastos: { fecha: string; importe: number; categoria?: CategoriaGasto }[];
  },
  hoy: string,
): MesFinanciero[] {
  let anio = Number(hoy.slice(0, 4));
  let mes = Number(hoy.slice(5, 7)) - 1;
  const serie: MesFinanciero[] = [];
  for (let i = 0; i < 12; i++) {
    const clave = `${anio}-${String(mes + 1).padStart(2, "0")}`;
    serie.unshift({
      mes: MESES_CORTOS[mes],
      anio,
      ingresos: suma(d.pagos.filter((p) => p.fecha.startsWith(clave)), (p) => p.importe),
      gastos: suma(d.gastos.filter((g) => g.fecha.startsWith(clave)), (g) => g.importe),
    });
    [anio, mes] = mes === 0 ? [anio - 1, 11] : [anio, mes - 1];
  }
  return serie;
}

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
