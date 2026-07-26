/**
 * Estilos y convención de `id` de los campos de formulario del panel.
 *
 * En un solo sitio por la misma razón que nacieron `Card` y `rejilla.ts`: en
 * cuanto estas clases se copian a mano al tercer campo, dejan de ser iguales.
 *
 * ⚠️ **No reutiliza `auth/TextField.tsx`.** Ese componente lo usan `/login` y
 * `/registro`: tocarlo para meter `<select>`, casillas y `ref` sería tocar la web
 * pública por un formulario del panel. Son dos productos distintos — la misma
 * razón por la que `/admin` no usa el Navbar ni el Footer. Además su estética es
 * la de la web pública (`rounded-xl`, `bg-white/60`) y aquí manda la del panel
 * (`rounded-full`, `min-h-[44px]`, `bg-white`).
 */

const BASE =
  "w-full min-h-[44px] rounded-full border bg-white px-4 text-sm text-verde transition-colors duration-300 placeholder:text-verde-300 focus:outline-none";

const NORMAL = "border-beige hover:border-dorado/60 focus:border-dorado";

/* El rojo sale de `--color-estado-grave`, el token de marca, y no del `red-600`
   de Tailwind que usa la web pública: así el error del panel habla el mismo
   idioma que las pastillas de estado del listado. */
const INVALIDO =
  "border-[var(--color-estado-grave)] focus:border-[var(--color-estado-grave)]";

export function control(hayError: boolean): string {
  return `${BASE} ${hayError ? INVALIDO : NORMAL}`;
}

export const ETIQUETA = "mb-1.5 block text-sm font-medium text-verde";

export const AYUDA = "mt-1.5 text-xs text-verde-300";

export const ERROR = "mt-1.5 text-xs text-[var(--color-estado-grave)]";

/** Los avisos NO bloquean el guardado: van en ámbar, no en rojo. */
export const AVISO = "mt-1.5 text-xs text-[var(--color-estado-aviso)]";

/** Casilla con objetivo táctil de 44px pese a medir 16px el cuadrito.
 *  `accent-dorado` y `size-4` son la convención del panel (`MenuExportar`);
 *  `/registro` usa `accent-verde` y `h-4 w-4`, que es la de la web pública. */
export const FILA_CHECK =
  "flex min-h-[44px] cursor-pointer items-start gap-3 py-2 text-sm text-verde-700";

export const CASILLA = "mt-0.5 size-4 shrink-0 accent-dorado";

/**
 * Los tres ids que necesita un campo accesible.
 *
 * ⚠️ `aria-describedby` no existía en NINGÚN sitio del proyecto antes de esto:
 * el mensaje de error de `/registro` es un `<p>` suelto sin `id`, así que un
 * lector de pantalla no lo anuncia nunca al enfocar el campo. Esta convención es
 * lo que lo arregla, y por eso los ids se generan y no se escriben a mano.
 */
export function idsDeCampo(nombre: string) {
  return {
    input: `campo-${nombre}`,
    error: `campo-${nombre}-error`,
    ayuda: `campo-${nombre}-ayuda`,
  };
}

/** Une los ids que existen. `undefined` si no hay ninguno: un
 *  `aria-describedby=""` apunta a la nada y confunde al lector. */
export function describedBy(
  ids: { error: string; ayuda: string },
  hayError: boolean,
  hayAyuda: boolean,
): string | undefined {
  const partes = [hayAyuda && ids.ayuda, hayError && ids.error].filter(Boolean);
  return partes.length ? partes.join(" ") : undefined;
}
