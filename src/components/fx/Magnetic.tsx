"use client";

import { useEffect, useRef, type ReactNode } from "react";

type MagneticProps = {
  children: ReactNode;
  /** Fuerza del imán (px de desplazamiento máx aprox.) */
  strength?: number;
  className?: string;
};

/**
 * Envuelve un elemento (p. ej. un botón) para que se "imante" hacia el cursor
 * al acercarse. Solo en dispositivos con puntero fino (escritorio) y si no se
 * pidió movimiento reducido.
 */
export default function Magnetic({
  children,
  strength = 0.35,
  className = "",
}: MagneticProps) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * strength;
      const dy = (e.clientY - cy) * strength;
      el.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
    };
    const onLeave = () => {
      el.style.transform = "translate(0px, 0px)";
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [strength]);

  return (
    <span
      ref={ref}
      className={`inline-block transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${className}`}
    >
      {children}
    </span>
  );
}
