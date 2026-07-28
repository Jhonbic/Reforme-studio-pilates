import type { TipoClase, TipoIdentificacion } from "./types";

/**
 * Listas cerradas del dominio.
 *
 * ⚠️ **No van en `mock.ts`.** `mock.ts` son datos de ejemplo que se tiran el día
 * que haya base de datos; estas listas son dominio y sobreviven a ese cambio.
 */

export const TIPOS_IDENTIFICACION: TipoIdentificacion[] = [
  "C.C.",
  "T.I.",
  "C.E.",
  "Pasaporte",
  "R.C.",
];

/** Los que no son numéricos y por tanto no se filtran a dígitos. */
export const TIPOS_ALFANUMERICOS: TipoIdentificacion[] = ["Pasaporte"];

export const ETIQUETA_TIPO: Record<TipoIdentificacion, string> = {
  "C.C.": "C.C. — Cédula de ciudadanía",
  "T.I.": "T.I. — Tarjeta de identidad",
  "C.E.": "C.E. — Cédula de extranjería",
  Pasaporte: "Pasaporte",
  "R.C.": "R.C. — Registro civil",
};

/**
 * EPS que operan en Caquetá, más «Otra».
 *
 * ⚠️ **Es una lista cerrada a propósito.** En texto libre la base acumularía
 * «Sanitas», «sanitas», «EPS Sanitas» y «SANITAS S.A.» como cuatro EPS
 * distintas, y no se podría volver a agrupar ni contar por EPS nunca. «Otra»
 * abre un campo de texto para lo que falte, pero lo habitual entra aquí.
 */
export const EPS = [
  "Nueva EPS",
  "Emssanar",
  "Asmet Salud",
  "Coosalud",
  "Sanitas",
  "Sura",
  "Salud Total",
  "Compensar",
  "Famisanar",
  "Mutual Ser",
  "Aliansalud",
  "Otra",
] as const;

/** El valor que dispara el campo de texto libre. */
export const EPS_OTRA = "Otra";

/**
 * El documento de términos y condiciones que se acepta al darse de alta.
 *
 * ⚠️ **El archivo NO existe todavía**: hay que dejarlo en
 * `public/terminos-y-condiciones.pdf` o el enlace dará 404. No se inventa aquí
 * porque es un documento legal del estudio, no algo que pueda redactar la web.
 *
 * En una constante y no escrito en el formulario porque el mismo enlace hará
 * falta en `/registro` (donde hoy hay un `href="#"` muerto) y en la futura ficha
 * del cliente.
 */
export const URL_TERMINOS = "/terminos-y-condiciones.pdf";

/* ── Agenda de clases ───────────────────────────────────────────────────── */

/** ⚠️ Provisional: las tiene que confirmar el estudio. Ver `TipoClase`. */
export const TIPOS_CLASE: TipoClase[] = ["Reformer", "Mat", "Privada"];

/**
 * Cuánta gente cabe en cada modalidad, como valor de partida al crear.
 *
 * ⚠️ **Es una sugerencia, no un límite**: el campo queda editable porque el
 * aforo real depende de cuántas máquinas haya en la sala, y eso no lo sabe el
 * código. Lo que sí evita es teclear «8» seiscientas veces.
 *
 * `Privada` es 1 por definición: si cupieran dos, no sería privada.
 */
export const CUPOS_SUGERIDOS: Record<TipoClase, number> = {
  Reformer: 8,
  Mat: 12,
  Privada: 1,
};

/**
 * Duraciones que se pueden elegir.
 *
 * ⚠️ **Lista cerrada y no un campo numérico**, y esto ahorra una validación
 * entera: con un `<input>` habría que rechazar el 0, los negativos, el 7 y el
 * 500. Siendo un `<select>`, **una duración imposible no se puede elegir** — la
 * misma doctrina que el selector de periodo del dashboard («los rangos
 * imposibles no se validan: no se pueden elegir»).
 */
export const DURACIONES_MIN = [30, 45, 50, 55, 60, 75, 90];

/** Primera y última hora a la que puede empezar una clase, y el salto entre
 *  horas seleccionables. Fuera de esa franja el estudio está cerrado. */
const APERTURA = "05:00";
const CIERRE = "21:00";
const PASO_MIN = 15;

/**
 * Las horas de inicio seleccionables, de 05:00 a 21:00 cada cuarto de hora.
 *
 * Se generan en vez de escribirse: son 65 y a mano acabarían con un salto o un
 * duplicado. Por el mismo motivo que las duraciones, esto convierte «la hora no
 * es válida» en un error que **no puede existir**.
 */
export const HORAS_CLASE: string[] = (() => {
  const [hA, mA] = APERTURA.split(":").map(Number);
  const [hC, mC] = CIERRE.split(":").map(Number);
  const horas: string[] = [];
  for (let m = hA * 60 + mA; m <= hC * 60 + mC; m += PASO_MIN) {
    horas.push(
      `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`,
    );
  }
  return horas;
})();
