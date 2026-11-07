/**
 * Campaña de apertura con descuento por tramos (nov 2026).
 *
 * ⚠️ Quien cobra es la base (`registrar_membresia`, que elige el tramo con
 * un candado para que dos ventas a la vez no se lleven el mismo cupo). Esto
 * repite sus reglas solo para ANUNCIARLAS antes de cobrar; si divergen,
 * manda la base, y la acción devuelve lo que se cobró de verdad.
 *
 * Reglas: primera membresía del cliente · el tramo va sobre el precio de
 * lista y NO se suma al descuento propio del plan. (Pagada entera ya no es
 * una regla de la campaña: desde nov 2026 todo plan se cobra entero.)
 */

import { precioConDescuento } from "./descuento";

export type EstadoCampana = {
  id: string;
  nombre: string;
  desde: string;
  hasta: string;
  /** Si se fijó, las membresías de la campaña empiezan ese día. */
  inicioMembresias: string | null;
  vendidas: number;
  /** La suma de los cupos de todos los tramos. */
  meta: number;
  /** El tramo en curso, o `null` si los cupos se agotaron. */
  tramo: { orden: number; pct: number; quedan: number } | null;
};

/**
 * El % de apertura que le toca a esta venta, o `null` si no entra (sin campaña, cupos agotados o no es su primera membresía).
 */
export function aperturaPosible(
  campana: EstadoCampana | null,
  primeraMembresia: boolean,
): number | null {
  if (!campana?.tramo || !primeraMembresia) return null;
  return campana.tramo.pct;
}

/** Lo que cuesta el plan en esta venta: con el % de apertura, sobre el
 *  precio de lista; sin él, el precio de hoy (con el descuento del plan). */
export function precioDeVenta(
  plan: { precio: number; precioLista: number },
  pctApertura: number | null,
): number {
  return pctApertura === null ? plan.precio : precioConDescuento(plan.precioLista, pctApertura);
}

/* ---------------------------------------------------------------------------
   Configuración de campañas (fase 3)
   --------------------------------------------------------------------------- */

export type TramoCampana = { cupos: number; pct: number };

/** Una campaña tal como la gestiona Configuración. */
export type CampanaConfig = {
  id: string;
  nombre: string;
  desde: string;
  hasta: string;
  inicioMembresias: string | null;
  /** Terminada a mano («Terminar ahora»): ya no se aplica, aunque sus fechas sigan. */
  cerrada: boolean;
  tramos: TramoCampana[];
  /** Membresías vendidas con ella (cada una es un cupo). */
  vendidas: number;
};

export type EstadoDeCampana = "En curso" | "Programada" | "Terminada";

export function estadoDeCampana(
  c: { desde: string; hasta: string; cerrada?: boolean },
  hoy: string,
): EstadoDeCampana {
  if (c.cerrada || c.hasta < hoy) return "Terminada";
  if (c.desde > hoy) return "Programada";
  return "En curso";
}

/** La meta: la suma de los cupos. */
export const metaDe = (tramos: TramoCampana[]) => tramos.reduce((s, t) => s + t.cupos, 0);

export const MAX_TRAMOS = 10;
export const PORCENTAJES_CAMPANA = [5, 10, 15, 20, 25, 30, 35, 40, 50] as const;

export type BorradorCampana = {
  nombre: string;
  desde: string;
  hasta: string;
  /** Vacío = las membresías empiezan el día del pago. */
  inicio: string;
  tramos: TramoCampana[];
};

export type CampoCampana = "nombre" | "desde" | "hasta" | "inicio" | "tramos";

/**
 * Lo que impide guardar. La misma función en el formulario y en la server
 * action; la base lo vuelve a comprobar (checks, solapes, tramos 1–10).
 *
 * `nueva`: al crear, no se empieza en el pasado. Al editar una campaña que
 * ya empezó, su `desde` puede ser anterior a hoy.
 */
export function erroresCampana(
  b: BorradorCampana,
  hoy: string,
  nueva: boolean,
): Partial<Record<CampoCampana, string>> {
  const e: Partial<Record<CampoCampana, string>> = {};
  const nombre = b.nombre.trim();
  if (nombre.length < 3) e.nombre = "Ponle un nombre (al menos 3 letras).";
  else if (nombre.length > 80) e.nombre = "Hasta 80 letras.";

  const fecha = /^\d{4}-\d{2}-\d{2}$/;
  if (!fecha.test(b.desde)) e.desde = "Elige el primer día.";
  else if (nueva && b.desde < hoy) e.desde = "No puede empezar en el pasado.";
  if (!fecha.test(b.hasta)) e.hasta = "Elige el último día.";
  else if (b.hasta < hoy) e.hasta = "El último día ya pasó.";
  else if (fecha.test(b.desde) && b.hasta < b.desde) e.hasta = "Tiene que ser igual o posterior al primero.";

  if (b.inicio !== "") {
    if (!fecha.test(b.inicio)) e.inicio = "Elige el día.";
    else if (fecha.test(b.desde) && b.inicio < b.desde)
      e.inicio = "No puede ser antes de que empiece la campaña.";
  }

  if (b.tramos.length === 0) e.tramos = "Añade al menos un tramo.";
  else if (b.tramos.length > MAX_TRAMOS) e.tramos = `Como mucho ${MAX_TRAMOS} tramos.`;
  else if (b.tramos.some((t) => !Number.isInteger(t.cupos) || t.cupos < 1 || t.cupos > 10000))
    e.tramos = "Cada tramo necesita de 1 a 10.000 membresías.";
  else if (b.tramos.some((t) => !Number.isInteger(t.pct) || t.pct < 1 || t.pct > 90))
    e.tramos = "Cada descuento va del 1 al 90 %.";
  return e;
}

/** «Las primeras 20 al 15 %, las siguientes 25 al 10 % y las siguientes 35 al 5 %». */
export function frasesTramos(tramos: TramoCampana[]): string {
  const partes = tramos.map(
    (t, i) => `${i === 0 ? "las primeras" : "las siguientes"} ${t.cupos} al ${t.pct} %`,
  );
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

/* ---------------------------------------------------------------------------
   Dashboard (fase 4)
   --------------------------------------------------------------------------- */

/** Un tramo de la barra del dashboard: cuánto ocupa y cuánto lleva lleno. */
export type SegmentoCampana = {
  pct: number;
  cupos: number;
  /** Vendidas dentro de este tramo (0…cupos). */
  llenos: number;
  /** Si es el tramo en curso. */
  actual: boolean;
};

/**
 * Reparte lo vendido entre los tramos, en orden: los primeros se llenan
 * antes. El tramo en curso es el primero que no está lleno (ninguno si se
 * agotaron), igual que en `estado_campana()`.
 */
export function segmentosCampana(tramos: TramoCampana[], vendidas: number): SegmentoCampana[] {
  let resto = Math.max(0, vendidas);
  let actualVisto = false;
  return tramos.map((t) => {
    const llenos = Math.min(t.cupos, resto);
    resto -= llenos;
    const actual = !actualVisto && llenos < t.cupos;
    if (actual) actualVisto = true;
    return { pct: t.pct, cupos: t.cupos, llenos, actual };
  });
}

/* ---------------------------------------------------------------------------
   De la base a la app (la usan el panel, el área de cliente y la portada)
   --------------------------------------------------------------------------- */

/** Una fila de `estado_campana()`. */
export type FilaEstadoCampana = {
  campana_id: string;
  nombre: string;
  desde: string;
  hasta: string;
  inicio_membresias: string | null;
  vendidas: number;
  meta: number;
  tramo_orden: number | null;
  tramo_pct: number | null;
  quedan_en_tramo: number | null;
};

export function aEstadoCampana(c: FilaEstadoCampana): EstadoCampana {
  return {
    id: c.campana_id,
    nombre: c.nombre,
    desde: c.desde,
    hasta: c.hasta,
    inicioMembresias: c.inicio_membresias,
    vendidas: c.vendidas,
    meta: c.meta,
    tramo:
      c.tramo_orden !== null && c.tramo_pct !== null && c.quedan_en_tramo !== null
        ? { orden: c.tramo_orden, pct: c.tramo_pct, quedan: c.quedan_en_tramo }
        : null,
  };
}
