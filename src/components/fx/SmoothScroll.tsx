"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Scroll suave con inercia (Lenis) para toda la página.
 * - Se desactiva si el usuario prefiere movimiento reducido.
 * - Intercepta los enlaces de ancla (#seccion / /#seccion) para desplazarse
 *   con suavidad hasta la sección, compensando la navbar fija.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
    });

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // Desplazamiento suave para anclas internas
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href) return;

      const hashIndex = href.indexOf("#");
      if (hashIndex === -1) return;
      // Solo anclas de la propia página ("#x" o "/#x")
      const before = href.slice(0, hashIndex);
      if (before && before !== "/") return;

      const id = href.slice(hashIndex + 1);
      const el = id ? document.getElementById(id) : document.body;
      if (!el) return;

      e.preventDefault();
      lenis.scrollTo(el, { offset: -80, duration: 1.3 });
      history.replaceState(null, "", `#${id}`);
    };

    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
