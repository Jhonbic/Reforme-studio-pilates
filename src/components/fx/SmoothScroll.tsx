"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

/**
 * Scroll suave con inercia (Lenis) para la WEB PÚBLICA.
 * - Se desactiva si el usuario prefiere movimiento reducido.
 * - Se desactiva en `/admin` (ver abajo).
 * - Intercepta los enlaces de ancla (#seccion / /#seccion) para desplazarse
 *   con suavidad hasta la sección, compensando la navbar fija.
 */
export default function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /* ⚠️ Fuera del panel administrativo.
       Dos motivos, y el primero es un BUG real: Lenis cachea la altura
       desplazable, y el panel tiene `<details>` («Ver datos en tabla») que
       hacen crecer la página al abrirse. Lenis no se enteraba y dejaba el tope
       de scroll en la altura vieja → no se podía bajar a ver la tabla.
       El segundo es de criterio: en una herramienta de trabajo, donde se busca
       un dato concreto, la inercia estorba. */
    if (pathname?.startsWith("/admin")) return;

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

    /* Misma clase de fallo que el de arriba, por si en la web pública aparece
       algo que cambie de alto (un acordeón, una imagen que carga tarde):
       Lenis necesita que le avisen para recalcular el tope de scroll. */
    const ro = new ResizeObserver(() => lenis.resize());
    ro.observe(document.body);

    return () => {
      document.removeEventListener("click", onClick);
      ro.disconnect();
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, [pathname]);

  return null;
}
