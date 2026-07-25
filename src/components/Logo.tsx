import Link from "next/link";

type LogoProps = {
  /** Tamaño del isotipo en px (el texto escala en proporción) */
  size?: number;
  /** Muestra el texto "REFORME / STUDIO PILATES" junto al isotipo */
  withWordmark?: boolean;
  /** Disposición del texto respecto al isotipo */
  layout?: "horizontal" | "stacked";
  className?: string;
  /** Envolver en enlace a la home */
  href?: string;
};

/**
 * Isotipo de Reforme (figura + ola/montaña) recreado como line-art.
 * Usa `currentColor`, así que hereda el color del contenedor:
 *   text-verde  → sobre fondos claros
 *   text-arena  → sobre fondos oscuros (verde/dorado)
 * Sustituible por el SVG oficial de marca sin tocar el resto de la UI.
 */
export function Isotype({
  size = 48,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={(size * 130) / 240}
      viewBox="0 0 240 130"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* Cabeza */}
      <ellipse
        cx="118"
        cy="24"
        rx="8"
        ry="11"
        transform="rotate(-12 118 24)"
        stroke="currentColor"
        strokeWidth="3"
      />
      {/* Arco exterior — montaña / movimiento */}
      <path
        d="M18 104 C 55 104, 78 52, 120 48 C 168 44, 178 84, 214 92"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Ola interior — propósito */}
      <path
        d="M120 60 C 150 58, 150 92, 176 92 C 196 92, 200 82, 214 76"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Logo({
  size = 46,
  withWordmark = true,
  layout = "stacked",
  className = "",
  href = "/",
}: LogoProps) {
  const mark = (
    <span
      className={`inline-flex select-none ${
        layout === "stacked"
          ? "flex-col items-center gap-2"
          : "flex-row items-center gap-3"
      } ${className}`}
    >
      <Isotype size={size} />
      {withWordmark && (
        <span className="flex flex-col items-center leading-none">
          <span
            className="font-display tracking-[0.14em]"
            style={{ fontSize: size * 0.62 }}
          >
            REFORME
          </span>
          <span className="mt-1 flex items-center gap-2">
            <span className="rule-gold w-4" />
            <span
              className="eyebrow"
              style={{ fontSize: Math.max(size * 0.16, 8), letterSpacing: "0.3em" }}
            >
              Studio Pilates
            </span>
            <span className="rule-gold w-4" />
          </span>
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label="Reforme Studio Pilates — inicio"
        className="inline-flex transition-opacity duration-300 hover:opacity-80"
      >
        {mark}
      </Link>
    );
  }
  return mark;
}
