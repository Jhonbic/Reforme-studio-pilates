/**
 * Formateo de cifras para el panel. Locale fijo `es-CO` para que el servidor y
 * el cliente pinten lo mismo (si se dejara al locale del navegador, el HTML
 * del servidor y el del cliente no coincidirían y React avisaría de hidratación).
 */

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const COP_CORTO = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 1,
});

const NUMERO = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

/** $1.234.567 */
export function moneda(v: number): string {
  return COP.format(v);
}

/** $12,4 M — para ejes y etiquetas donde no cabe la cifra completa. */
export function monedaCorta(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `$${COP_CORTO.format(v / 1_000_000)} M`;
  if (Math.abs(v) >= 1_000) return `$${COP_CORTO.format(v / 1_000)} k`;
  return `$${NUMERO.format(v)}`;
}

export function numero(v: number): string {
  return NUMERO.format(v);
}

/** 78,5 % */
export function porcentaje(v: number, decimales = 1): string {
  return `${v.toFixed(decimales).replace(".", ",")} %`;
}

/** +12,4 % / −3,1 % — con signo explícito, para las variaciones. */
export function variacion(v: number): string {
  const signo = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${signo}${Math.abs(v).toFixed(1).replace(".", ",")} %`;
}

/** Variación porcentual entre dos periodos. `null` si no hay base. */
export function calcularVariacion(
  actual: number,
  anterior: number,
): number | null {
  if (!anterior) return null;
  return ((actual - anterior) / anterior) * 100;
}

export function formatearValor(
  v: number,
  formato: "moneda" | "numero" | "porcentaje",
): string {
  if (formato === "moneda") return moneda(v);
  if (formato === "porcentaje") return porcentaje(v);
  return numero(v);
}

/**
 * Los gráficos son componentes de cliente y las páginas que los usan son de
 * servidor. React NO deja pasar funciones a través de esa frontera, así que en
 * vez de un formateador se les pasa el NOMBRE del formato y lo resuelven ellos.
 */
export type FormatoValor =
  | "moneda"
  | "monedaCorta"
  | "numero"
  | "porcentaje"
  | "clientes";

export function fmt(v: number, formato: FormatoValor): string {
  switch (formato) {
    case "moneda":
      return moneda(v);
    case "monedaCorta":
      return monedaCorta(v);
    case "porcentaje":
      return porcentaje(v);
    case "clientes":
      return `${numero(v)} ${v === 1 ? "cliente" : "clientes"}`;
    default:
      return numero(v);
  }
}
