import { diasEntre, lunesDe, sumarDias } from "@/lib/admin/horario";
import type { ClaseParaCliente, MiCuenta } from "@/lib/cliente/datos";
import { cubre } from "@/lib/cliente/inicio";

/**
 * Reglas de la vista «Reservar una clase» (nov 2026): qué puede hacer el
 * cliente con cada clase, qué semanas y horas se pintan. Funciones puras, con
 * tests (`reservar.test.ts`). Las usan el bloque de la rejilla, la hoja de
 * confirmación y la tira de la semana, así que no pueden contradecirse.
 *
 * Solo ANUNCIAN lo que la base comprobará al pulsar (`reservar_mi_clase`,
 * `unirme_lista_espera`…): la regla de verdad está allí.
 */

export type EstadoParaMi =
  /** Puede reservarla ya. */
  | "disponible"
  /** Ya es suya. */
  | "reservada"
  /** Está en su lista de espera. */
  | "espera"
  /** Llena, pero podría entrar si alguien cancela: lista de espera. */
  | "llena-espera"
  /** Llena y además no podría entrar (sin plan o sin clases). */
  | "llena"
  /** Su plan no cubre ese día. */
  | "sin-plan"
  /** Le cubre, pero ya gastó las clases de esa modalidad. */
  | "sin-clases"
  /** Las privadas se piden en recepción. */
  | "privada";

/**
 * Qué puede hacer con esta clase. El orden de las comprobaciones ES la regla:
 * lo suyo primero (reservada, en espera); luego lo que impide reservar sin
 * remedio (privada, sin plan, sin clases); y la llena al final, porque una
 * llena que podría reservar se ofrece con lista de espera.
 */
export function estadoParaMi(c: ClaseParaCliente, cobertura: MiCuenta["cobertura"]): EstadoParaMi {
  if (c.reservada) return "reservada";
  if (c.puestoEspera !== null) return "espera";
  if (c.disponibles === null) return "privada";
  const llena = c.libres <= 0;
  if (!cubre(cobertura, c.fecha)) return llena ? "llena" : "sin-plan";
  if (c.disponibles <= 0) return llena ? "llena" : "sin-clases";
  return llena ? "llena-espera" : "disponible";
}

/** Lo que se puede pedir con un toque (reservar o apuntarse a la espera). */
export function esAccionable(e: EstadoParaMi): boolean {
  return e === "disponible" || e === "llena-espera";
}

/** El texto corto del bloque: siempre con palabras, nunca solo color. */
export function textoEstado(e: EstadoParaMi, c: ClaseParaCliente): string {
  switch (e) {
    case "disponible":
      return `${c.libres} ${c.libres === 1 ? "libre" : "libres"}`;
    case "reservada":
      return "✓ Tu clase";
    case "espera":
      return `En espera · ${c.puestoEspera}.º`;
    case "llena-espera":
      return "Llena · lista de espera";
    case "llena":
      return "Llena";
    case "sin-plan":
      return "Sin plan ese día";
    case "sin-clases":
      return `Sin clases de ${c.tipo}`;
    case "privada":
      return "En recepción";
  }
}

/**
 * ¿Falta más que el plazo de cancelación? `ahoraMin` en minutos desde las
 * 00:00 de hoy. Cuenta los días de diferencia: con un plazo de 24 h, una clase
 * de mañana a las 07:00 ya no se cancela a las 08:00 de hoy.
 */
export function cancelable(
  c: { fecha: string; horaInicio: string },
  hoy: string,
  ahoraMin: number,
  horas: number,
): boolean {
  const [h, m] = c.horaInicio.split(":").map(Number);
  const faltan = diasEntre(hoy, c.fecha) * 24 * 60 + h * 60 + m - ahoraMin;
  return faltan > horas * 60;
}

/**
 * Los lunes de las semanas que se pueden mirar: desde la de hoy hasta la del
 * último día que trae la agenda. Siempre al menos la de hoy (aunque no haya
 * clases: la tira enseña la semana vacía en vez de nada).
 */
export function semanasDeAgenda(hoy: string, agenda: ClaseParaCliente[]): string[] {
  const ultimo = agenda.reduce((m, c) => (c.fecha > m ? c.fecha : m), hoy);
  const semanas: string[] = [];
  for (let l = lunesDe(hoy); l <= lunesDe(ultimo); l = sumarDias(l, 7)) semanas.push(l);
  return semanas;
}

/** Los siete días (ISO) de la semana que empieza ese lunes. */
export function diasDeSemana(lunes: string): string[] {
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}

/** Las horas distintas de esas clases, en orden («07:00» < «18:00» como texto). */
export function horasDe(clases: ClaseParaCliente[]): string[] {
  return [...new Set(clases.map((c) => c.horaInicio))].sort();
}

const ORDEN_SALA: Record<ClaseParaCliente["tipo"], number> = { Reformer: 0, Mat: 1, Privada: 2 };

/** Reformer, luego Mat, luego privadas: cada sala siempre en su sitio. */
export function porSala(a: ClaseParaCliente, b: ClaseParaCliente): number {
  return ORDEN_SALA[a.tipo] - ORDEN_SALA[b.tipo];
}

/**
 * El día que se abre al entrar: hoy si le queda alguna clase hoy; si no, el
 * primero con alguna clase que pueda reservar; si no, el primero con clases;
 * y si no hay nada, hoy.
 */
export function diaInicial(hoy: string, agenda: ClaseParaCliente[], cobertura: MiCuenta["cobertura"]): string {
  if (agenda.some((c) => c.fecha === hoy)) return hoy;
  const reservable = agenda.find((c) => esAccionable(estadoParaMi(c, cobertura)));
  return reservable?.fecha ?? agenda[0]?.fecha ?? hoy;
}
