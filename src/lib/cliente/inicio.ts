import { diaSemana, diasEntre, sumarDias } from "@/lib/admin/horario";
import type { ClasePasada, ClaseParaCliente, MiCuenta } from "@/lib/cliente/datos";

/**
 * Cálculos del Inicio de `/mi-cuenta` (nov 2026): la tarjeta del plan, «Con
 * cupo para ti» y el calendario «Tus clases». Funciones puras,
 * sin React, para poder probarlas (`inicio.test.ts`).
 *
 * Todas las fechas son ISO cortas (`AAAA-MM-DD`) y `hoy` llega del servidor
 * (`hoyEnBogota()`), como en el resto del área de cliente.
 */

/** ¿Alguna membresía cubre ese día? Anuncia ANTES de pulsar lo que la base
 *  comprobará al reservar. */
export function cubre(cobertura: MiCuenta["cobertura"], dia: string): boolean {
  return cobertura.some((m) => m.inicio <= dia && dia <= m.vencimiento);
}

// ── Tarjeta del plan ─────────────────────────────────────────────────────────

export type Vigencia =
  /** Pagó un plan que todavía no empieza. */
  | { tipo: "por-empezar"; diasParaEmpezar: number; dias: number }
  /** En curso. `diasRestantes` = 0 el último día (vence hoy). */
  | { tipo: "en-curso"; diasRestantes: number; dias: number; transcurrido: number };

/**
 * Cuánto lleva consumido del plan. `transcurrido` va de 0 a 1 y cuenta HOY
 * como día usado: el primer día ya hay algo de barra, y el último está llena.
 * `null` si falta alguna fecha o el plan ya venció (ahí la tarjeta habla de
 * renovar, no de días).
 */
export function vigenciaPlan(
  inicio: string | null,
  vencimiento: string | null,
  hoy: string,
): Vigencia | null {
  if (!inicio || !vencimiento || vencimiento < hoy) return null;
  const dias = diasEntre(inicio, vencimiento) + 1;
  if (inicio > hoy) {
    return { tipo: "por-empezar", diasParaEmpezar: diasEntre(hoy, inicio), dias };
  }
  const usados = diasEntre(inicio, hoy) + 1;
  return {
    tipo: "en-curso",
    diasRestantes: diasEntre(hoy, vencimiento),
    dias,
    transcurrido: Math.min(1, Math.max(0, usados / dias)),
  };
}

// ── Con cupo para ti ─────────────────────────────────────────────────────────

/**
 * Las próximas clases que SÍ puede reservar con un toque: con cupo, que su
 * plan cubra ese día, con clases de esa modalidad y que no tenga ya (ni esté
 * esperando). Las privadas no: se piden en recepción. Ya vienen ordenadas
 * por fecha y hora desde la base.
 */
export function conCupoParaMi(
  agenda: ClaseParaCliente[],
  cobertura: MiCuenta["cobertura"],
  max = 3,
): ClaseParaCliente[] {
  return agenda
    .filter(
      (c) =>
        !c.reservada &&
        c.puestoEspera === null &&
        c.libres > 0 &&
        c.disponibles !== null &&
        c.disponibles > 0 &&
        cubre(cobertura, c.fecha),
    )
    .slice(0, max);
}

/**
 * «Empieza en 40 min», «Empieza en 3 h» para una clase de hoy que aún no ha
 * empezado; `null` si es otro día (ahí ya lo dice «Mañana» o la fecha).
 * `ahoraMin` en minutos desde las 00:00 de hoy, de Bogotá.
 */
export function faltaPara(c: { fecha: string; horaInicio: string }, hoy: string, ahoraMin: number): string | null {
  if (c.fecha !== hoy) return null;
  const [h, m] = c.horaInicio.split(":").map(Number);
  const faltan = h * 60 + m - ahoraMin;
  if (faltan <= 0) return null;
  if (faltan < 60) return `Empieza en ${faltan} min`;
  const horas = Math.floor(faltan / 60);
  return `Empieza en ${horas} h`;
}

// ── Historial: qué cuenta como clase tomada ─────────────────────────────────

/**
 * Una clase pasada cuenta como TOMADA si el estudio no la canceló y nadie la
 * marcó «No vino». Sin marcar se da por tomada: la clase ya se descontó del
 * plan y lo normal es que viniera (casi todo lo anterior a oct 2026 está sin
 * marcar). El calendario sí distingue «sin marcar» con su propio símbolo.
 */
export function tomada(c: ClasePasada): boolean {
  return !c.cancelada && c.asistencia !== "No vino";
}

// ── Tus clases: calendario del mes ──────────────────────────────────────────

/** Cuántos meses hacia atrás deja mirar el calendario. La página pide el
 *  historial de ese tramo (`getMiHistorial`) y el calendario no pasa de ahí. */
export const MESES_HISTORIAL = 6;

/** Lo que se pinta en un día del calendario, de más a menos importante. */
export type MarcaDia = "asistio" | "sin-marcar" | "no-vino" | "proxima";

const PRIORIDAD: MarcaDia[] = ["asistio", "sin-marcar", "no-vino", "proxima"];

export type CeldaMes = {
  fecha: string;
  esHoy: boolean;
  marca: MarcaDia | null;
  /** Clases ese día (tomadas, perdidas o reservadas), para el nombre accesible. */
  clases: number;
};

/** «2026-11» → «2026-11-01». */
function primerDia(mes: string): string {
  return `${mes}-01`;
}

/** El mes siguiente o anterior: «2026-11» + 1 → «2026-12». */
export function moverMes(mes: string, delta: number): string {
  const [a, m] = mes.split("-").map(Number);
  const total = a * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/**
 * Las semanas del mes (lunes a domingo) con la marca de cada día. Los huecos
 * de antes del día 1 y de después del último son `null`.
 */
export function calendarioMes(
  mes: string,
  hoy: string,
  historial: ClasePasada[],
  agenda: ClaseParaCliente[],
): (CeldaMes | null)[][] {
  const inicio = primerDia(mes);
  const fin = sumarDias(primerDia(moverMes(mes, 1)), -1);
  const celdas: (CeldaMes | null)[] = Array.from({ length: diaSemana(inicio) }, () => null);

  for (let fecha = inicio; fecha <= fin; fecha = sumarDias(fecha, 1)) {
    const marcas: MarcaDia[] = [];
    for (const c of historial) {
      if (c.fecha !== fecha || c.cancelada) continue;
      marcas.push(c.asistencia === "Asistió" ? "asistio" : c.asistencia === "No vino" ? "no-vino" : "sin-marcar");
    }
    for (const c of agenda) if (c.fecha === fecha && c.reservada) marcas.push("proxima");
    const marca = PRIORIDAD.find((p) => marcas.includes(p)) ?? null;
    celdas.push({ fecha, esHoy: fecha === hoy, marca, clases: marcas.length });
  }
  while (celdas.length % 7 !== 0) celdas.push(null);

  const semanas: (CeldaMes | null)[][] = [];
  for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7));
  return semanas;
}

/** Clases tomadas en ese mes («2026-11»). */
export function tomadasEnMes(mes: string, historial: ClasePasada[]): number {
  return historial.filter((c) => c.fecha.startsWith(mes) && tomada(c)).length;
}
