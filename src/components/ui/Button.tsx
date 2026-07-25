"use client";

import Link from "next/link";
import { useState, type ComponentProps, type PointerEvent, type ReactNode } from "react";

type Variant = "primary" | "gold" | "outline" | "outlineLight" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "btn-fx isolate inline-flex items-center justify-center gap-2 font-sans font-semibold tracking-wide rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2";

const variants: Record<Variant, string> = {
  primary:
    "bg-verde text-arena hover:bg-verde-900 shadow-soft hover:shadow-lift hover:-translate-y-0.5",
  gold: "bg-dorado text-verde-900 hover:bg-dorado-dark hover:text-arena shadow-soft hover:shadow-lift hover:-translate-y-0.5",
  // Contorno sobre fondos claros
  outline:
    "border border-verde/40 text-verde hover:bg-verde hover:text-arena hover:border-verde",
  // Contorno sobre fondos oscuros (verde/dorado): texto arena, sin conflictos
  outlineLight:
    "border border-arena/40 text-arena hover:bg-arena hover:text-verde hover:border-arena",
  ghost: "text-current hover:text-dorado",
};

const sizes: Record<Size, string> = {
  sm: "text-xs px-4 py-2",
  md: "text-sm px-6 py-2.5",
  lg: "text-base px-8 py-3.5",
};

type Ripple = { x: number; y: number; size: number; id: number };

function useRipple() {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const id = Date.now() + Math.random();
    setRipples((r) => [...r, { x, y, size, id }]);
    window.setTimeout(
      () => setRipples((r) => r.filter((p) => p.id !== id)),
      650
    );
  };

  const rippleEls = ripples.map((r) => (
    <span
      key={r.id}
      className="btn-ripple"
      style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
    />
  ));

  return { onPointerDown, rippleEls };
}

const Fx = ({ children }: { children: ReactNode }) => (
  <>
    <span className="btn-sheen" aria-hidden="true" />
    <span className="relative z-10 inline-flex items-center gap-2">
      {children}
    </span>
  </>
);

type CommonProps = {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
};

// Como enlace (next/link)
export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  children,
  onPointerDown,
  ...props
}: CommonProps & ComponentProps<typeof Link>) {
  const { onPointerDown: ripple, rippleEls } = useRipple();
  return (
    <Link
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      onPointerDown={(e) => {
        ripple(e);
        onPointerDown?.(e);
      }}
      {...props}
    >
      <Fx>{children}</Fx>
      {rippleEls}
    </Link>
  );
}

// Como botón nativo
export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  onPointerDown,
  ...props
}: CommonProps & ComponentProps<"button">) {
  const { onPointerDown: ripple, rippleEls } = useRipple();
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      onPointerDown={(e) => {
        ripple(e);
        onPointerDown?.(e);
      }}
      {...props}
    >
      <Fx>{children}</Fx>
      {rippleEls}
    </button>
  );
}
