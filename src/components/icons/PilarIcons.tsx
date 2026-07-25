type IconProps = {
  size?: number;
  className?: string;
};

/**
 * Iconos de los tres pilares.
 * Mismos conceptos que la web anterior (persona · calendario · corazón),
 * recreados como line-art con el mismo trazo que el isotipo de marca
 * para que la sección se sienta parte del sistema y no un set genérico.
 * Usan `currentColor` → heredan el color del contenedor.
 */

const base = (size: number, className: string) => ({
  width: size,
  height: size,
  viewBox: "0 0 48 48",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className,
});

/** Personalizado — figura humana (acompañamiento uno a uno) */
export function IconPersonalizado({ size = 32, className = "" }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="24" cy="16" r="7" />
      <path d="M10 39c0-6.6 6.3-11 14-11s14 4.4 14 11" />
    </svg>
  );
}

/** Alta Calidad — agenda / sesión reservada con detalle */
export function IconAltaCalidad({ size = 32, className = "" }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="8" y="12" width="32" height="28" rx="4" />
      <path d="M8 21h32" />
      <path d="M17 8v7M31 8v7" />
      <path d="M21 30.5l2.2 2.4 4.6-5" />
    </svg>
  );
}

/** Bienestar Integral — corazón (cuidado físico y emocional) */
export function IconBienestar({ size = 32, className = "" }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M24 39.5C13 31 8 26.4 8 20.2A8.7 8.7 0 0 1 24 15.4a8.7 8.7 0 0 1 16 4.8c0 6.2-5 10.8-16 19.3Z" />
    </svg>
  );
}
