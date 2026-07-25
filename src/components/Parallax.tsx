"use client";

import { useEffect, useRef, type ReactNode } from "react";

type ParallaxProps = {
  children: ReactNode;
  /**
   * Intensidad y sentido. Negativo = sube más lento que el scroll (fondo),
   * positivo = se adelanta. Rango recomendado: -0.3 a 0.3.
   */
  speed?: number;
  className?: string;
};

/**
 * Traslada su contenido en Y según la posición del elemento en el viewport.
 * Usa rAF para ir fluido y respeta prefers-reduced-motion.
 */
export default function Parallax({
  children,
  speed = -0.15,
  className = "",
}: ParallaxProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let ticking = false;

    const update = () => {
      const rect = el.getBoundingClientRect();
      // Distancia del centro del elemento al centro del viewport
      const fromCenter = rect.top + rect.height / 2 - window.innerHeight / 2;
      const offset = fromCenter * speed;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        raf = requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [speed]);

  return (
    <div ref={ref} className={`will-change-transform ${className}`}>
      {children}
    </div>
  );
}
