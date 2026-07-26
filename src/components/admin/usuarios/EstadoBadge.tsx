import type { EstadoMembresia } from "@/lib/admin/types";

/**
 * Pastilla de estado.
 *
 * ⚠️ **Nunca codifica solo con color** — misma regla que `Variacion.tsx`. Cada
 * estado lleva su propio símbolo, así que se distingue igual en escala de
 * grises, con daltonismo o impreso. El símbolo va `aria-hidden`: el texto de al
 * lado ya dice lo mismo.
 */
export function Pastilla({
  simbolo,
  texto,
  clase,
}: {
  simbolo: string;
  texto: string;
  clase: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs ${clase}`}
    >
      <span aria-hidden="true">{simbolo}</span>
      {texto}
    </span>
  );
}

/* `color-mix` en vez de `/10` y `/30` porque los estados son variables CSS, no
   colores del tema de Tailwind: la sintaxis de opacidad con barra solo funciona
   con estos últimos.

   Estrena `--color-estado-aviso`, definido en `globals.css` desde el principio
   y hasta ahora sin usar. `Inactiva` va en neutro a propósito: no es una
   alarma, es alguien que dejó de venir. */
const ESTILOS: Record<EstadoMembresia, { simbolo: string; clase: string }> = {
  Activa: {
    simbolo: "●",
    clase:
      "border-[color-mix(in_srgb,var(--color-estado-ok)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-estado-ok)_10%,transparent)] text-[var(--color-estado-ok)]",
  },
  "Por vencer": {
    simbolo: "▲",
    clase:
      "border-[color-mix(in_srgb,var(--color-estado-aviso)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-estado-aviso)_10%,transparent)] text-[var(--color-estado-aviso)]",
  },
  Vencida: {
    simbolo: "■",
    clase:
      "border-[color-mix(in_srgb,var(--color-estado-grave)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-estado-grave)_10%,transparent)] text-[var(--color-estado-grave)]",
  },
  Inactiva: {
    simbolo: "○",
    clase: "border-beige bg-beige/40 text-verde-300",
  },
};

export default function EstadoBadge({ estado }: { estado: EstadoMembresia }) {
  const { simbolo, clase } = ESTILOS[estado];
  return <Pastilla simbolo={simbolo} texto={estado} clase={clase} />;
}
