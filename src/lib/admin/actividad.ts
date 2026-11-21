/**
 * Actividad de reservas (nov 2026): quién reservó, canceló o cambió una clase.
 *
 * Funciones puras, sin React: las usan la página «Actividad» y sus tests. Los
 * avisos los escribe la base (trigger `reservas_dejan_actividad`, migración
 * 20261121120000); aquí solo se cuentan, se filtran y se dicen.
 */
import { fecha } from "./format";
import { diaCorto, diaRelativo } from "./horario";
import type { TipoClase } from "./types";

export type TipoAviso = "Reservó" | "Canceló" | "Cambió";
/** Sin sesión (semilla, restaurar una copia) no se apunta nada: no hay «Sistema». */
export type OrigenAviso = "Cliente" | "Equipo" | "Lista de espera";

export type AvisoReserva = {
  id: string;
  /** Instante del movimiento (ISO con zona). */
  creadoEn: string;
  tipo: TipoAviso;
  origen: OrigenAviso;
  /** Quién lo hizo, si fue alguien del equipo o el cliente. */
  hechoPor: string | null;
  clienteId: string;
  cliente: string;
  clase: { fecha: string; hora: string; tipo: TipoClase };
  /** Solo en un cambio: de qué clase salió. */
  anterior: { fecha: string; hora: string } | null;
  /** «Dada de baja», cuando las reservas se quitaron al dar de baja. */
  detalle: string | null;
  /** Lo hizo quien está mirando: no cuenta como nuevo. */
  mio: boolean;
};

/* Sustantivos y no verbos: «Reservó» en una pastilla junto a un movimiento
   que hizo recepción se leería como si lo hubiera hecho el cliente. */
export const ETIQUETA_TIPO: Record<TipoAviso, string> = {
  Reservó: "Reserva",
  Canceló: "Cancelación",
  Cambió: "Cambio",
};

export type FiltroTipo = "Todos" | TipoAviso;
export type FiltroOrigen = "Todos" | OrigenAviso;

export const FILTROS_TIPO: { valor: FiltroTipo; etiqueta: string }[] = [
  { valor: "Todos", etiqueta: "Todo" },
  { valor: "Reservó", etiqueta: "Reservas" },
  { valor: "Canceló", etiqueta: "Cancelaciones" },
  { valor: "Cambió", etiqueta: "Cambios" },
];

export const FILTROS_ORIGEN: { valor: FiltroOrigen; etiqueta: string }[] = [
  { valor: "Todos", etiqueta: "Cualquiera" },
  { valor: "Cliente", etiqueta: "El cliente" },
  { valor: "Equipo", etiqueta: "El equipo" },
  { valor: "Lista de espera", etiqueta: "Lista de espera" },
];

export function filtrarAvisos(
  avisos: AvisoReserva[],
  tipo: FiltroTipo,
  origen: FiltroOrigen,
): AvisoReserva[] {
  return avisos.filter(
    (a) => (tipo === "Todos" || a.tipo === tipo) && (origen === "Todos" || a.origen === origen),
  );
}

/** Cuántos hay de cada tipo (para las pastillas), sobre lo que deja el filtro de origen. */
export function contarPorTipo(avisos: AvisoReserva[]): Record<FiltroTipo, number> {
  const cuenta: Record<FiltroTipo, number> = { Todos: avisos.length, Reservó: 0, Canceló: 0, Cambió: 0 };
  for (const a of avisos) cuenta[a.tipo] += 1;
  return cuenta;
}

const DIA_BOGOTA = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const HORA_BOGOTA = new Intl.DateTimeFormat("en-GB", {
  timeZone: "America/Bogota",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * El día (`AAAA-MM-DD`) en que pasó, **en Colombia**. Ni `toISOString()` (UTC:
 * desde las 19:00 sería ya mañana) ni los getters locales (el servidor de
 * Vercel va en UTC).
 */
export function diaDelAviso(instante: string): string {
  return DIA_BOGOTA.format(new Date(instante));
}

/** `"14:05"`, hora de Colombia. */
export function horaDelAviso(instante: string): string {
  return HORA_BOGOTA.format(new Date(instante));
}

/**
 * «Ahora», «Hace 5 min», «Hace 2 h» o la hora. `ahora` llega del servidor como
 * prop: calculado en el navegador, el HTML del servidor y el del cliente no
 * coincidirían en el minuto justo.
 */
export function cuandoPaso(instante: string, ahora: string): string {
  const min = Math.floor((new Date(ahora).getTime() - new Date(instante).getTime()) / 60_000);
  if (min < 1) return "Ahora";
  if (min < 60) return `Hace ${min} min`;
  if (min < 6 * 60) return `Hace ${Math.floor(min / 60)} h`;
  return horaDelAviso(instante);
}

/** «jue 27 nov · 07:00» */
export function cuandoEsLaClase(c: { fecha: string; hora: string }): string {
  return `${diaCorto(c.fecha)} ${fecha(c.fecha)} · ${c.hora.slice(0, 5)}`;
}

/**
 * Quién lo hizo, en una línea: lo que distingue un movimiento del cliente de
 * uno del mostrador.
 */
export function quienLoHizo(a: AvisoReserva): string {
  if (a.detalle === "Dada de baja") {
    return a.hechoPor ? `Al darla de baja · ${a.hechoPor}` : "Al darla de baja";
  }
  switch (a.origen) {
    case "Cliente":
      return "Desde su cuenta";
    case "Equipo":
      return a.hechoPor ? `Desde el panel · ${a.hechoPor}` : "Desde el panel";
    case "Lista de espera":
      return "Entró sola desde la lista de espera";
  }
}

export type GrupoDeDia = { dia: string; titulo: string; avisos: AvisoReserva[] };

/** Agrupa por día de Colombia, en el orden en que llegan (del más nuevo al más viejo). */
export function agruparPorDia(avisos: AvisoReserva[], hoy: string): GrupoDeDia[] {
  const grupos: GrupoDeDia[] = [];
  for (const a of avisos) {
    const dia = diaDelAviso(a.creadoEn);
    let grupo = grupos.at(-1);
    if (!grupo || grupo.dia !== dia) {
      const titulo = diaRelativo(dia, hoy);
      grupo = { dia, titulo: titulo.charAt(0).toUpperCase() + titulo.slice(1), avisos: [] };
      grupos.push(grupo);
    }
    grupo.avisos.push(a);
  }
  return grupos;
}

/** Lo que llegó después de la última vez que se miró. Lo propio no cuenta. */
export function esNuevo(a: AvisoReserva, vistoHasta: string): boolean {
  if (a.mio) return false;
  return new Date(a.creadoEn).getTime() > new Date(vistoHasta).getTime();
}
