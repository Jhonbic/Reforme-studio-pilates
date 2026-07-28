/**
 * Pastilla de estado del panel.
 *
 * ⚠️ **Nunca codifica solo con color** — misma regla que `Variacion.tsx`. Cada
 * estado lleva su propio símbolo, así que se distingue igual en escala de
 * grises, con daltonismo o impreso. El símbolo va `aria-hidden`: el texto de al
 * lado ya dice lo mismo.
 *
 * Vivía dentro de `usuarios/EstadoBadge.tsx`, que fue donde nació. Se subió a
 * `admin/` al aparecer el segundo consumidor —los estados de clase—: un
 * `import { Pastilla } from "../usuarios/EstadoBadge"` desde `clases/` habría
 * atado dos módulos que no tienen nada que ver. Es el mismo movimiento que ya
 * hicieron `Card` y `CardHeader`.
 */
export default function Pastilla({
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

/* Los cuatro pares de color de estado del panel, en un solo sitio. `color-mix`
   en vez de `/10` y `/30` porque los estados son variables CSS, no colores del
   tema de Tailwind: la sintaxis de opacidad con barra solo funciona con estos
   últimos.

   `neutro` NO es una alarma: es para lo que ya pasó o dejó de moverse
   («Inactiva», «Finalizada»). */
export const TONO_ESTADO = {
  ok: "border-[color-mix(in_srgb,var(--color-estado-ok)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-estado-ok)_10%,transparent)] text-[var(--color-estado-ok)]",
  aviso:
    "border-[color-mix(in_srgb,var(--color-estado-aviso)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-estado-aviso)_10%,transparent)] text-[var(--color-estado-aviso)]",
  grave:
    "border-[color-mix(in_srgb,var(--color-estado-grave)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-estado-grave)_10%,transparent)] text-[var(--color-estado-grave)]",
  neutro: "border-beige bg-beige/40 text-verde-300",
} as const;
