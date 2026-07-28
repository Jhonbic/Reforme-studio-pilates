/**
 * Aritmética de días y horas de la agenda de clases.
 *
 * Funciones **puras, sin React y sin datos**: reciben cadenas y devuelven
 * cadenas. Viven aquí y no en `format.ts` porque casi ninguna formatea — la
 * mayoría calcula (cuándo termina una clase, si dos se pisan, qué lunes abre la
 * semana). Y no van en `lib/validacion.ts` porque eso es validación de
 * formularios genérica; esto es el horario del estudio.
 *
 * ⚠️ **Las horas se guardan y se pintan en 24 h (`"07:00"`).** Se descartó el
 * `7:00 a. m.` de `es-CO` a propósito: en una agenda de seis clases al día la
 * columna de la hora se lee en vertical, y `a. m.`/`p. m.` la ensancha un 60 %
 * para desambiguar algo que en 24 h no es ambiguo. Además `"18:00"` se ordena
 * alfabéticamente igual que cronológicamente, que es la misma razón por la que
 * las fechas van en ISO corto y no en `Date`.
 */

/** `"07:30"` → 450. Minutos desde medianoche: la única forma en la que las
 *  horas se pueden sumar y comparar sin equivocarse con el 60. */
export function aMinutos(hora: string): number {
  const [h, m] = hora.split(":");
  return Number(h) * 60 + Number(m);
}

/** 450 → `"07:30"`. Con cero a la izquierda, que es lo que hace que ordenar
 *  como texto siga siendo ordenar como hora. */
export function aHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Cuándo termina una clase. Se DERIVA de inicio + duración, nunca se guarda:
 *  guardado, cambiar la duración dejaría un fin que ya no corresponde. */
export function finDe(horaInicio: string, duracionMin: number): string {
  return aHora(aMinutos(horaInicio) + duracionMin);
}

/** `"07:00 – 07:50"`. Con raya (–) y no guion: es un rango, no un menos. */
export function rangoHorario(horaInicio: string, duracionMin: number): string {
  return `${horaInicio} – ${finDe(horaInicio, duracionMin)}`;
}

/** `50` → `"50 min"`; `60` → `"1 h"`; `90` → `"1 h 30"`. */
export function duracionLegible(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}

/**
 * Si dos tramos horarios se pisan.
 *
 * ⚠️ **Comparación estricta en los dos extremos**, y no es un detalle: una clase
 * de 07:00 a 07:50 y otra de 07:50 a 08:40 **no se solapan**. Con `<=` la
 * instructora no podría encadenar dos clases seguidas, que es exactamente lo que
 * hace todo el día.
 */
export function seSolapan(
  inicioA: string,
  duracionA: number,
  inicioB: string,
  duracionB: number,
): boolean {
  const a = aMinutos(inicioA);
  const b = aMinutos(inicioB);
  return a < b + duracionB && b < a + duracionA;
}

/* ── Fechas ────────────────────────────────────────────────────────────────
   Todo se opera en UTC con `Date.UTC`, igual que `format.ts`. Con los getters
   locales, `"2026-07-25"` se interpretaría como medianoche UTC y en Colombia
   (UTC−5) caería en el 24: la semana entera saldría corrida un día. */

function aFechaUTC(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function aIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function sumarDias(iso: string, dias: number): string {
  const d = aFechaUTC(iso);
  d.setUTCDate(d.getUTCDate() + dias);
  return aIso(d);
}

/** Días de `desde` a `hasta` (negativo si `hasta` es anterior). */
export function diasEntre(desde: string, hasta: string): number {
  const ms = aFechaUTC(hasta).getTime() - aFechaUTC(desde).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Día de la semana con **lunes = 0**.
 *
 * `getUTCDay()` devuelve domingo = 0, que es la convención de EE. UU.; aquí la
 * semana empieza en lunes, así que el domingo es el 6 y no el 0. Si esto se
 * dejara sin traducir, la tira de días de la agenda abriría en domingo.
 */
export function diaSemana(iso: string): number {
  return (aFechaUTC(iso).getUTCDay() + 6) % 7;
}

/** El lunes de la semana a la que pertenece esa fecha. */
export function lunesDe(iso: string): string {
  return sumarDias(iso, -diaSemana(iso));
}

const DIA_CORTO = new Intl.DateTimeFormat("es-CO", {
  weekday: "short",
  timeZone: "UTC",
});

const DIA_LARGO = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** `"sáb"` — sin el punto que mete `es-CO`, como ya hace `fecha()`. */
export function diaCorto(iso: string): string {
  return DIA_CORTO.format(aFechaUTC(iso)).replace(".", "");
}

/** `"sábado, 25 de julio"` — para el encabezado del día y los estados vacíos. */
export function diaLargo(iso: string): string {
  return DIA_LARGO.format(aFechaUTC(iso));
}

/**
 * Los siete nombres cortos, **empezando en lunes**: `["Lun", …, "Dom"]`.
 *
 * Se piden al locale en vez de escribirse a mano, para que digan lo mismo que
 * `diaCorto()` en el resto del panel. La fecha de referencia se pasa por
 * `lunesDe()` a propósito: así da igual qué día sea — no hay que acordarse de
 * que la constante tenía que ser un lunes.
 *
 * Van capitalizados porque son etiquetas de eje, no texto corrido; `es-CO`
 * devuelve los días en minúscula.
 */
export const DIAS_CORTOS: string[] = (() => {
  const lunes = lunesDe("2026-06-03");
  return Array.from({ length: 7 }, (_, i) => {
    const d = diaCorto(sumarDias(lunes, i));
    return d.charAt(0).toUpperCase() + d.slice(1);
  });
})();

/** El número del día, para la tira de la semana. */
export function numeroDia(iso: string): number {
  return aFechaUTC(iso).getUTCDate();
}

/**
 * «Hoy», «Mañana», «Ayer» o el día largo.
 *
 * Existe porque en una agenda la pregunta casi siempre es *cuándo respecto a
 * hoy*, y «sábado, 25 de julio» obliga a mirar el calendario para contestarla.
 */
export function diaRelativo(iso: string, hoy: string): string {
  const d = diasEntre(hoy, iso);
  if (d === 0) return "Hoy";
  if (d === 1) return "Mañana";
  if (d === -1) return "Ayer";
  return diaLargo(iso);
}
