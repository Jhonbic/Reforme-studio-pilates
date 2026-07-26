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

const FECHA_CORTA = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const FECHA_LARGA = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

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

/**
 * "25 jul" / "25 jul 2026" a partir de una fecha ISO corta.
 *
 * `timeZone: "UTC"` no es un detalle: sin él, `"2026-07-25"` se interpreta como
 * medianoche UTC y en Colombia (UTC−5) se pintaría como el 24.
 */
export function fecha(iso: string, conAnio = false): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return (conAnio ? FECHA_LARGA : FECHA_CORTA).format(d).replace(".", "");
}

/**
 * "5 feb 2024" — la fecha larga **sin los «de»**.
 *
 * ⚠️ No es un capricho tipográfico: `es-CO` compone la fecha larga como «5 de
 * feb de 2024», que ocupa casi el doble y desbordaba la columna «Desde» del
 * listado. Se reconstruye desde `formatToParts` y no con `replace(" de ", " ")`
 * porque así se descartan **los separadores** que el locale marca como
 * `literal`, sin tocar el orden ni los nombres de los meses.
 */
export function fechaCompacta(iso: string): string {
  const partes = FECHA_LARGA.formatToParts(new Date(`${iso}T00:00:00Z`));
  return partes
    .filter((p) => p.type !== "literal")
    .map((p) => (p.type === "month" ? p.value.replace(".", "") : p.value))
    .join(" ");
}

/**
 * Cédula con puntos de millar: `"1045678912"` → `"1.045.678.912"`.
 *
 * A mano y no con `Intl`: un documento es una **cadena de dígitos**, no una
 * cantidad. Pasarlo por `Number` perdería cualquier cero inicial y, con
 * documentos de extranjería más largos, chocaría con el límite de precisión.
 */
export function documento(id: string): string {
  return id.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * `"3209078814"` → `"+57 320 907 8814"`, el formato que ya usan los clientes.
 *
 * ⚠️ Solo se llama **al guardar**, nunca dentro de un `<input>` controlado:
 * formatear mientras se teclea descoloca el cursor si editas por el medio. El
 * estado guarda dígitos crudos.
 */
export function telefonoCO(digitos: string): string {
  if (digitos.length !== 10) return digitos;
  return `+57 ${digitos.slice(0, 3)} ${digitos.slice(3, 6)} ${digitos.slice(6)}`;
}

/** Iniciales para el avatar: "Juan Pablo Cortés" → "JC". */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  const primera = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1][0] ?? "") : "";
  return (primera + ultima).toUpperCase();
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
