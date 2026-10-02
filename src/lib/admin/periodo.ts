import { diasEntre, sumarDias } from "./horario";

/**
 * Periodo de Finanzas: un par `[desde, hasta]`, ISO corto, los dos incluidos.
 *
 * ⚠️ **Es la ÚNICA fuente de verdad de la pantalla.** «Este mes», «mes
 * anterior», un mes de la rejilla o un rango libre no son modos distintos con
 * su propio estado: los cuatro solo escriben este par. Misma doctrina que el
 * selector de periodo del dashboard — así es imposible que el botón diga una
 * cosa y las cifras otra.
 *
 * Todo en cadenas ISO y aritmética UTC (`horario.ts`): con los getters
 * locales, «2026-10-01» caería en el 30 de septiembre en Colombia.
 */
export type Periodo = { desde: string; hasta: string };

export const MESES_LARGOS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const MESES_CORTOS = MESES_LARGOS.map((m) => m.slice(0, 3));

/** «2026-10-01» → [2026, 9] (mes base 0). */
function anioMes(iso: string): [number, number] {
  return [Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1];
}

function iso(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Días que tiene un mes. El día 0 del mes siguiente es el último de este. */
function diasDelMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
}

/**
 * Un mes entero, pero **sin pasar de hoy**. El mes en curso va del 1 a hoy, no
 * al 31: lo que aún no ha pasado no tiene movimientos, y contarlo haría que el
 * rango que se enseña no fuera el que se suma.
 *
 * Un mes futuro daría `desde > hasta`: por eso el selector no deja elegirlos.
 */
export function periodoDeMes(anio: number, mes: number, hoy: string): Periodo {
  const desde = iso(anio, mes, 1);
  const fin = iso(anio, mes, diasDelMes(anio, mes));
  return { desde, hasta: fin < hoy ? fin : hoy };
}

export function esteMes(hoy: string): Periodo {
  const [a, m] = anioMes(hoy);
  return periodoDeMes(a, m, hoy);
}

export function mesAnterior(hoy: string): Periodo {
  const [a, m] = anioMes(hoy);
  return m === 0 ? periodoDeMes(a - 1, 11, hoy) : periodoDeMes(a, m - 1, hoy);
}

/** El periodo empieza el día 1 y no se sale de ese mes. */
function esDentroDeUnMes(p: Periodo): boolean {
  return p.desde.endsWith("-01") && p.desde.slice(0, 7) === p.hasta.slice(0, 7);
}

/**
 * Con qué se compara un periodo para la variación «▲ +12 %».
 *
 * ⚠️ **Mismo tramo del mes anterior, no el mes anterior entero.** El 1 de
 * octubre, «este mes» es un solo día: compararlo con todo septiembre daría
 * siempre «▼ −97 %», un desplome que no existe. Se compara del 1 al 1 de
 * septiembre. Un rango libre se compara con el mismo número de días justo
 * antes de él.
 */
export function periodoAnterior(p: Periodo): Periodo {
  if (esDentroDeUnMes(p)) {
    const [a, m] = anioMes(p.desde);
    const [aa, ma] = m === 0 ? [a - 1, 11] : [a, m - 1];
    const ultimo = diasDelMes(aa, ma);
    // Un mes ENTERO se compara con el anterior entero: septiembre (30 días)
    // contra agosto hasta el 31, no hasta el 30.
    const dh = Number(p.hasta.slice(8, 10));
    const dia = dh === diasDelMes(a, m) ? ultimo : Math.min(dh, ultimo);
    return { desde: iso(aa, ma, 1), hasta: iso(aa, ma, dia) };
  }
  const largo = diasEntre(p.desde, p.hasta) + 1;
  return { desde: sumarDias(p.desde, -largo), hasta: sumarDias(p.desde, -1) };
}

export function enPeriodo(fecha: string, p: Periodo): boolean {
  return fecha >= p.desde && fecha <= p.hasta;
}

/** Los meses que toca un periodo, como «2026-10-01»: así guarda la base los presupuestos. */
export function mesesDe(p: Periodo): string[] {
  const meses: string[] = [];
  let [a, m] = anioMes(p.desde);
  const [ah, mh] = anioMes(p.hasta);
  while (a < ah || (a === ah && m <= mh)) {
    meses.push(iso(a, m, 1));
    [a, m] = m === 11 ? [a + 1, 0] : [a, m + 1];
  }
  return meses;
}

/**
 * Cómo se nombra un periodo.
 *
 * - «octubre 2026» si es un mes entero, **o el mes en curso hasta hoy**: va
 *   por la mitad, pero es «este mes» y así se lee.
 * - «1 – 15 sep 2026» si es un trozo de mes. ⚠️ Es el caso de la comparación:
 *   el 1 de octubre, «este mes» se compara con el 1 de septiembre, y llamarlo
 *   «septiembre 2026» haría creer que se compara con el mes entero.
 * - «3 sep – 18 oct 2026» si cruza meses.
 */
export function etiquetaPeriodo(p: Periodo, hoy: string): string {
  const [a, m] = anioMes(p.desde);
  const [ah, mh] = anioMes(p.hasta);
  const dd = Number(p.desde.slice(8, 10));
  const dh = Number(p.hasta.slice(8, 10));

  if (esDentroDeUnMes(p) && (dh === diasDelMes(a, m) || p.hasta === hoy)) {
    return `${MESES_LARGOS[m]} ${a}`;
  }
  if (p.desde === p.hasta) return `${dd} ${MESES_CORTOS[m]} ${a}`;
  if (a === ah && m === mh) return `${dd} – ${dh} ${MESES_CORTOS[m]} ${a}`;

  const inicio = a === ah ? `${dd} ${MESES_CORTOS[m]}` : `${dd} ${MESES_CORTOS[m]} ${a}`;
  return `${inicio} – ${dh} ${MESES_CORTOS[mh]} ${ah}`;
}
