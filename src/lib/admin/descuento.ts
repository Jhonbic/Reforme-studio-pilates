/**
 * Descuentos de los planes (oct 2026, pedido del estudio).
 *
 * El precio del plan no se toca: el descuento va aparte (`descuento_pct` y,
 * si se quiere, `descuento_hasta`). Así se puede enseñar «antes $X» y
 * quitarlo sin tener que recordar el precio de antes.
 *
 * ⚠️ La misma cuenta vive en la base (`precio_vigente()`), que es la que cobra
 * en `registrar_membresia`. Aquí se repite para ENSEÑAR el precio antes de
 * cobrarlo; si alguna vez divergen, manda la base.
 */

export type Descuento = {
  pct: number;
  /** Último día (incluido), o `null` si no tiene fin. */
  hasta: string | null;
};

/** El descuento si está vigente `hoy` (fechas ISO); si no hay o ya pasó, `null`. */
export function descuentoVigente(
  pct: number | null,
  hasta: string | null,
  hoy: string,
): Descuento | null {
  if (pct === null || pct <= 0) return null;
  if (hasta !== null && hasta < hoy) return null;
  return { pct, hasta };
}

/** Redondeado al peso, igual que `round()` en la base. */
export function precioConDescuento(precio: number, pct: number): number {
  return Math.round((precio * (100 - pct)) / 100);
}

/** Lo que cuesta hoy: con el descuento si está vigente, si no el precio. */
export function precioVigente(
  precio: number,
  pct: number | null,
  hasta: string | null,
  hoy: string,
): number {
  const d = descuentoVigente(pct, hasta, hoy);
  return d ? precioConDescuento(precio, d.pct) : precio;
}

/** Los porcentajes que se ofrecen en el formulario: un `<select>`, no un
 *  campo libre, así un 0 % o un 150 % no se pueden elegir. */
export const PORCENTAJES_DESCUENTO = [5, 10, 15, 20, 25, 30, 35, 40, 50] as const;
