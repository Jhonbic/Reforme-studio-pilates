"use client";

import type { Ref } from "react";
import { ERROR, idsDeCampo } from "@/components/admin/campos/estilos";

export type OpcionPlan = {
  /** El id del plan, o uno de los dos valores especiales del formulario. */
  valor: string;
  titulo: string;
  /** La cifra grande: el precio, o lo que sustituye al precio. */
  destacado: string;
  detalle: string;
};

/**
 * El plan del alta como tarjetas pequeñas (decisión del usuario, frente al
 * `<select>` que tuvo primero): con cuatro o cinco opciones se comparan de un
 * vistazo, cosa que un desplegable esconde.
 *
 * ⚠️ **Por debajo son `<input type="radio">` nativos**, ocultos con `sr-only`
 * y no con `hidden`: así se conservan gratis las flechas del teclado para
 * moverse entre opciones, el anuncio «1 de 5, seleccionado» del lector de
 * pantalla y el envío del foco al fallar. Una rejilla de `<button>` obligaría
 * a reescribir todo eso a mano.
 *
 * - ⚠️ **Seleccionada NO se rellena** (decisión del usuario: «no quiero que
 *   se rellene como botón»). Se queda en blanco y lo que cambia es el borde:
 *   dorado y **grueso** (`ring-2` sólido), **más un ✓** — nunca solo el borde.
 * - Hover: el borde solo cambia a dorado, SIN engordar. Si engordara, pasar el
 *   ratón por encima se vería igual que haberla elegido.
 * - Foco de teclado en una no elegida: el mismo anillo, pero translúcido. En
 *   la elegida no se añade: pisaría al sólido y parecería que se deselecciona.
 * - `ring` y no `border-2`, o el contenido temblaría 1px.
 */
export default function SelectorPlan({
  opciones,
  valor,
  onCambio,
  error,
  ref,
}: {
  opciones: OpcionPlan[];
  valor: string;
  onCambio: (valor: string) => void;
  error?: string;
  /** Al primer radio: es a donde va el foco si el envío falla. */
  ref?: Ref<HTMLInputElement>;
}) {
  const ids = idsDeCampo("plan");

  return (
    <div className="sm:col-span-2">
      <div
        role="radiogroup"
        aria-label="Plan"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? ids.error : undefined}
        className="grid grid-cols-2 gap-3 lg:grid-cols-3"
      >
        {opciones.map((o, i) => {
          const elegida = o.valor === valor;
          return (
            <label
              key={o.valor}
              className={`relative flex min-h-[96px] cursor-pointer flex-col rounded-2xl border p-4 transition-[border-color,box-shadow,background-color] duration-300 ${
                elegida
                  ? "border-dorado bg-white text-verde ring-2 ring-dorado"
                  : `bg-white text-verde hover:border-dorado has-[:focus-visible]:border-dorado has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-dorado/45 ${
                      error
                        ? "border-[var(--color-estado-grave)]"
                        : "border-beige"
                    }`
              }`}
            >
              <input
                ref={i === 0 ? ref : undefined}
                type="radio"
                name="plan"
                value={o.valor}
                checked={elegida}
                onChange={() => onCambio(o.valor)}
                className="sr-only"
              />
              {elegida && (
                <span
                  aria-hidden="true"
                  className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-dorado text-[11px] text-verde-900"
                >
                  ✓
                </span>
              )}
              <span className="pr-6 text-sm font-medium">{o.titulo}</span>
              <span className="mt-1 font-display text-2xl leading-none tabular-nums">
                {o.destacado}
              </span>
              <span className="mt-auto pt-2 text-xs text-verde-300">
                {o.detalle}
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id={ids.error} className={ERROR}>
          {error}
        </p>
      )}
    </div>
  );
}
