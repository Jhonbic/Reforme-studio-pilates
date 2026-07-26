/**
 * La rejilla de las filas del listado, en **un solo sitio**.
 *
 * ⚠️ La cabecera de columnas y las filas son rejillas **independientes**: no
 * comparten contexto de tamaño como lo harían las celdas de una `<table>`. Por
 * eso ninguna columna puede ser `auto` — cada rejilla mediría su propio
 * contenido y los rótulos quedarían desplazados respecto a los datos. Todas las
 * columnas llevan **ancho fijo o fracción**, y la plantilla se declara aquí para
 * que cabecera y fila no puedan divergir.
 *
 * Los anchos fijos salen del contenido más ancho de cada columna:
 * `2.75rem` = el `h-11 w-11` del `Avatar`; `7rem` = la pastilla «▲ Por vencer»;
 * `5rem` = «25 jul»; `6rem` = «5 feb 2024»; `0.75rem` = el chevron.
 *
 * En móvil no hay columnas que rotular: la fila se apila y cada dato lleva su
 * propia etiqueta cuando le hace falta.
 */

const COMUN = "grid items-center gap-x-4 px-4 sm:px-5";

/** Avatar · nombre · plan · estado · vencimiento · chevron */
export const REJILLA_CLIENTE = `${COMUN} grid-cols-[auto_1fr_auto] md:grid-cols-[2.75rem_minmax(0,2.4fr)_minmax(0,1fr)_7rem_5rem_0.75rem]`;

/** Avatar · nombre · rol · estado · alta. Sin chevron: no hay ficha de miembro. */
export const REJILLA_EQUIPO = `${COMUN} grid-cols-[auto_1fr] md:grid-cols-[2.75rem_minmax(0,2.4fr)_minmax(0,1fr)_7rem_6rem]`;

/**
 * Rótulo de columna. **No usa `.eyebrow`** aunque el resto del panel sí: su
 * `letter-spacing` de `0.32em` desbordaría las columnas estrechas como «Vence».
 */
export const ROTULO =
  "text-[0.7rem] uppercase tracking-[0.14em] text-verde-300";
