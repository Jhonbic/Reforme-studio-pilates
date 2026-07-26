import type { TipoIdentificacion } from "./types";

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
