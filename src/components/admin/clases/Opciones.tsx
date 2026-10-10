"use client";

import { ETIQUETA } from "@/components/admin/campos/estilos";

export type Opcion<T extends string> = { valor: T; titulo: string; detalle?: string };

/**
 * Elegir una entre dos o tres cosas, con tarjetas pulsables: «¿Se repite?» y
 * «¿Qué quieres cambiar?» de la agenda.
 *
 * Radios nativos dentro de un `<fieldset>` y no botones: el teclado (flechas)
 * y el lector de pantalla ya saben qué es. La tarjeta entera es la etiqueta,
 * así el objetivo táctil es la fila y no el circulito.
 */
export default function Opciones<T extends string>({
  nombre,
  leyenda,
  valor,
  opciones,
  onCambio,
}: {
  nombre: string;
  leyenda: string;
  valor: T;
  opciones: Opcion<T>[];
  onCambio: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className={ETIQUETA}>{leyenda}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {opciones.map((o) => (
          <label
            key={o.valor}
            className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border border-beige bg-white px-4 py-3 text-sm transition-colors duration-300 hover:border-dorado/60 has-[:checked]:border-dorado has-[:checked]:bg-arena has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-dorado/40"
          >
            <input
              type="radio"
              name={nombre}
              value={o.valor}
              checked={valor === o.valor}
              onChange={() => onCambio(o.valor)}
              className="mt-0.5 size-4 shrink-0 accent-dorado"
            />
            <span>
              <span className="block font-bold text-verde first-letter:uppercase">{o.titulo}</span>
              {o.detalle && <span className="mt-0.5 block text-verde-700">{o.detalle}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
