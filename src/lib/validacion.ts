/**
 * Validación y normalización de entradas de formulario.
 *
 * **Sin React y sin dependencias**: son funciones puras, así que valen igual en
 * servidor y en cliente, y se pueden razonar de una en una.
 *
 * Nace con el formulario de alta (`/admin/usuarios/nuevo`), pero la regex de
 * correo ya estaba escrita a mano en `/registro`: este es el sitio donde deja de
 * estar duplicada.
 */

/** Correo con arroba y punto. Deliberadamente laxa: la única comprobación seria
 *  de un correo es enviarle algo, y una regex estricta rechaza direcciones
 *  válidas raras pero legales. */
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function esCorreo(v: string): boolean {
  return CORREO.test(v.trim());
}

/** Se queda solo con los dígitos. Con esto el error «solo números» no puede
 *  llegar a existir: los caracteres inválidos nunca entran en el campo. */
export function soloDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

/** Para pasaporte: letras y números, en mayúsculas. Un pasaporte NO es numérico,
 *  así que filtrarlo a dígitos borraría la mitad del documento mientras se
 *  teclea. */
export function soloAlfanumerico(texto: string): string {
  return texto.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

/**
 * Quita los dígitos de un nombre de persona.
 *
 * Se filtra al teclear en vez de avisar después, por lo mismo que el documento:
 * así el error «el nombre no lleva números» **no puede llegar a existir**. Cubre
 * también el pegado, porque el `onChange` salta igual al pegar.
 */
export function sinDigitos(texto: string): string {
  return texto.replace(/\d/g, "");
}

/** Para comparar dos nombres: sin tildes, sin mayúsculas y con los espacios
 *  colapsados, para que «Ana  MARÍA solano» y «ana maria Solano» sean el mismo. */
export function claveNombre(texto: string): string {
  return normalizar(texto).trim().replace(/\s+/g, " ");
}

/** Sin tildes y en minúsculas, para comparar y buscar. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Móvil colombiano: 10 dígitos empezando por 3.
 *
 * ⚠️ **Pegar un teléfono con indicativo tiene que funcionar.** Quien copia
 * «+57 320 907 8814» de WhatsApp obtendría 12 dígitos y un error incomprensible
 * («tiene 10 dígitos») justo después de haber pegado un teléfono correcto. Aquí
 * el `57` sobrante se quita en silencio.
 */
export function normalizarTelefonoPegado(texto: string): string {
  const d = soloDigitos(texto);
  if (d.length === 12 && d.startsWith("57")) return d.slice(2);
  return d.slice(0, 10);
}

export function esMovilCO(digitos: string): boolean {
  return /^3\d{9}$/.test(digitos);
}

/** La fecha de HOY en ISO corto y en hora LOCAL.
 *
 * ⚠️ **No vale `toISOString().slice(0, 10)`.** `toISOString` da UTC, y Colombia
 * va a UTC−5: a partir de las 19:00 devolvería ya el día siguiente, así que el
 * `max` del calendario dejaría elegir mañana y la edad saldría un día corrida.
 */
export function hoyLocalIso(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/**
 * Años cumplidos entre dos fechas ISO cortas.
 *
 * ⚠️ Compara **mes y día**, no milisegundos partidos por 365,25: con la división
 * quien cumple años hoy sale de 17 años y 364 días por los bisiestos. La regla
 * es la legal: **cumplir 18 hoy ya es ser mayor de edad.**
 *
 * Devuelve `null` si la fecha no es válida o es futura — no se inventa una edad.
 */
export function edad(nacimientoIso: string, hoyIso: string): number | null {
  const [an, mn, dn] = nacimientoIso.split("-").map(Number);
  const [ah, mh, dh] = hoyIso.split("-").map(Number);
  if (!an || !mn || !dn || !ah || !mh || !dh) return null;
  if (nacimientoIso > hoyIso) return null;

  let anios = ah - an;
  if (mh < mn || (mh === mn && dh < dn)) anios -= 1;
  return anios;
}

export const MAYORIA_DE_EDAD = 18;

/** Longitud aceptada de un documento colombiano. La C.C. moderna tiene 10
 *  dígitos y las antiguas 8; los 6 de mínimo dejan sitio a las más viejas. */
export const DOC_MIN = 6;
export const DOC_MAX = 10;
