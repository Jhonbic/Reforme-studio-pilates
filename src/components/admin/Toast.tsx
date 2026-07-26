"use client";

import { useEffect } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

/* ⚠️ Los colores salen de `--color-estado-*`, NO de la paleta de Tailwind
   (`red-600`, `green-50`…). Es la misma regla que sigue `EstadoBadge`: el rojo
   del panel es `--color-estado-grave`, y el `red-600` de Tailwind es el de la
   web pública. Mezclarlos haría que un error en un aviso flotante y el mismo
   error en un campo de formulario fueran de dos rojos distintos.

   `color-mix()` en vez de `bg-token/10` porque los estados son variables CSS,
   no colores del `@theme`: la sintaxis de opacidad con barra solo funciona con
   estos últimos.

   ⚠️ **Nunca se codifica solo con color** — misma doctrina que `Variacion` y
   `EstadoBadge`. Cada tipo lleva su símbolo, así que se distingue igual en
   escala de grises o con daltonismo. El símbolo va `aria-hidden`: quien usa
   lector ya recibe el texto del mensaje.

   `info` va en el verde de marca a propósito: no es una alarma, así que no
   gasta ninguno de los tres colores de estado. */
const ESTILOS: Record<ToastType, { simbolo: string; clase: string }> = {
  success: {
    simbolo: "●",
    clase:
      "border-[color-mix(in_srgb,var(--color-estado-ok)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-estado-ok)_10%,white)] text-[var(--color-estado-ok)]",
  },
  warning: {
    simbolo: "▲",
    clase:
      "border-[color-mix(in_srgb,var(--color-estado-aviso)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-estado-aviso)_10%,white)] text-[var(--color-estado-aviso)]",
  },
  error: {
    simbolo: "■",
    clase:
      "border-[color-mix(in_srgb,var(--color-estado-grave)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-estado-grave)_10%,white)] text-[var(--color-estado-grave)]",
  },
  info: {
    simbolo: "○",
    clase: "border-beige bg-white text-verde",
  },
};

type Props = {
  id: string;
  mensaje: string;
  tipo: ToastType;
  onDescartar: (id: string) => void;
  /** Milisegundos hasta el cierre automático. `0` = no se cierra solo. */
  duracion?: number;
};

export default function Toast({
  id,
  mensaje,
  tipo,
  onDescartar,
  duracion = 4000,
}: Props) {
  useEffect(() => {
    if (duracion <= 0) return;
    const t = setTimeout(() => onDescartar(id), duracion);
    return () => clearTimeout(t);
  }, [id, duracion, onDescartar]);

  const { simbolo, clase } = ESTILOS[tipo];

  return (
    <div
      className={`toast-in flex items-center gap-3 rounded-2xl border py-2 pl-4 pr-2 shadow-lift ${clase}`}
    >
      <span aria-hidden="true" className="text-sm">
        {simbolo}
      </span>
      <p className="flex-1 py-1 text-sm text-verde-700">{mensaje}</p>
      <button
        type="button"
        onClick={() => onDescartar(id)}
        /* 44px de objetivo táctil como el resto del panel, aunque la ✕ dibujada
           sea pequeña: el área que se pulsa no es la que se ve. */
        className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-verde-300 transition-colors duration-300 hover:text-verde focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado"
        aria-label="Descartar aviso"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
