type SectionWaveProps = {
  /** Clase de relleno de la paleta: "fill-arena" | "fill-beige" | "fill-verde" ... */
  fillClass: string;
  /** Dos trazados orgánicos para variar entre divisores */
  variant?: 1 | 2;
  /** Espeja horizontalmente la onda */
  flip?: boolean;
  className?: string;
};

const paths: Record<1 | 2, string> = {
  1: "M0,64 C240,112 480,16 720,48 C960,80 1200,120 1440,68 L1440,120 L0,120 Z",
  2: "M0,84 C320,8 520,116 800,72 C1080,28 1220,96 1440,52 L1440,120 L0,120 Z",
};

/**
 * Onda decorativa que se coloca al fondo de una sección y "vierte" el color
 * de la siguiente, fundiendo ambas sin cortes rectos. El color se pasa como
 * utilidad `fill-*` de Tailwind para heredar los tokens de marca.
 */
export default function SectionWave({
  fillClass,
  variant = 1,
  flip = false,
  className = "",
}: SectionWaveProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 -bottom-px z-10 leading-[0] ${className}`}
    >
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className={`block h-[56px] w-full sm:h-[80px] lg:h-[104px] ${
          flip ? "-scale-x-100" : ""
        }`}
      >
        <path className={fillClass} d={paths[variant]} />
      </svg>
    </div>
  );
}
