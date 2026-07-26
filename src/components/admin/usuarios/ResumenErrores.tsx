"use client";

import type { Ref } from "react";

type Props = {
  /** Ya en el orden de la pantalla. */
  errores: { campo: string; etiqueta: string; mensaje: string }[];
  onIr: (campo: string) => void;
  ref?: Ref<HTMLDivElement>;
};

/**
 * Lo que sale al fallar el envío.
 *
 * ⚠️ **El foco viene aquí, no al primer campo inválido.** Enfocar el primer campo
 * esconde *cuántos* problemas hay: arreglas uno, envías, aparece otro — una
 * tortura por goteo en un formulario de catorce campos. El resumen los enseña
 * todos de golpe y desde él se salta a cada uno.
 *
 * ⚠️ **`role="alert"` vive AQUÍ y en ningún otro sitio.** Cinco `role="alert"` a
 * la vez, uno por campo, son un grito ininteligible en un lector de pantalla. Los
 * mensajes de campo se comunican con `aria-describedby` + `aria-invalid`, que es
 * suficiente porque el foco va a acabar llegando a ellos.
 */
export default function ResumenErrores({ errores, onIr, ref }: Props) {
  if (errores.length === 0) return null;

  return (
    <div
      ref={ref}
      role="alert"
      /* `tabIndex={-1}` para poder enfocarlo por código sin meterlo en el orden
         de tabulación: nadie debe tropezarse con él tabulando. */
      tabIndex={-1}
      className="rounded-2xl border border-[var(--color-estado-grave)] bg-[color-mix(in_srgb,var(--color-estado-grave)_7%,white)] p-4 focus:outline-none sm:p-5"
    >
      <p className="font-display text-lg text-[var(--color-estado-grave)]">
        {errores.length === 1
          ? "Falta un dato por revisar"
          : `Faltan ${errores.length} datos por revisar`}
      </p>
      <ul className="mt-2 space-y-1">
        {errores.map((e) => (
          <li key={e.campo}>
            <button
              type="button"
              onClick={() => onIr(e.campo)}
              className="text-left text-sm text-verde-700 underline underline-offset-4 transition-colors duration-200 hover:text-[var(--color-estado-grave)]"
            >
              <span className="font-medium">{e.etiqueta}:</span> {e.mensaje}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
