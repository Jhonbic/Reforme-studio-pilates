"use client";

import { useEffect, useRef } from "react";

// Dorado de marca en RGB para componer con alfa variable
const GOLD = "190, 155, 105";

type Dust = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  a: number;
};
type Ripple = { x: number; y: number; r: number; max: number; life: number };

/**
 * Capa interactiva del hero (canvas):
 *  - Motas doradas flotando muy lento (ambiente).
 *  - Ondas concéntricas ("goteo") al hacer clic o tocar — opcional.
 * Un único bucle rAF. Se desactiva por completo con prefers-reduced-motion.
 * pointer-events-none: nunca bloquea los botones del hero.
 */
export default function HeroFX({
  className = "",
  goteo = true,
}: {
  className?: string;
  /**
   * Ondas al hacer clic. Se apaga en el panel administrativo: allí casi todo
   * clic va a un control (un filtro, un desplegable, un enlace), y lanzar una
   * onda decorativa encima confunde sobre si la acción se registró.
   */
  goteo?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parent = canvas.parentElement as HTMLElement;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    let dust: Dust[] = [];
    const ripples: Ripple[] = [];

    const buildDust = () => {
      const count = Math.round((width * height) / 42000); // densidad ~ área
      dust = Array.from({ length: Math.max(14, Math.min(48, count)) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.6 + Math.random() * 2.2,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -(0.08 + Math.random() * 0.28),
        a: 0.15 + Math.random() * 0.4,
      }));
    };

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildDust();
    };

    const localFromEvent = (clientX: number, clientY: number) => {
      const rect = parent.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top, rect };
    };

    const onDown = (e: PointerEvent) => {
      const { x, y, rect } = localFromEvent(e.clientX, e.clientY);
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (!inside) return;
      const max = 90 + Math.random() * 60;
      ripples.push({ x, y, r: 6, max, life: 1 });
    };

    // Pausa el dibujo cuando la sección no está visible
    let onScreen = true;
    const io = new IntersectionObserver(
      ([entry]) => (onScreen = entry.isIntersecting),
      { rootMargin: "120px" }
    );
    io.observe(parent);

    const draw = () => {
      if (!onScreen) {
        raf = requestAnimationFrame(draw);
        return;
      }
      ctx.clearRect(0, 0, width, height);

      // --- Motas de polvo dorado ---
      for (const d of dust) {
        d.x += d.vx;
        d.y += d.vy;
        // Deriva suave y reciclaje al salir por arriba
        if (d.y < -6) {
          d.y = height + 6;
          d.x = Math.random() * width;
        }
        if (d.x < -6) d.x = width + 6;
        if (d.x > width + 6) d.x = -6;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${GOLD}, ${d.a})`;
        ctx.fill();
      }

      // --- Ondas al clic (goteo) ---
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.r += (rp.max - rp.r) * 0.06;
        rp.life -= 0.018;
        if (rp.life <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${GOLD}, ${rp.life * 0.5})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        // Halo interior tenue
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${GOLD}, ${rp.life * 0.22})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    };

    let raf = 0;
    resize();
    raf = requestAnimationFrame(draw);

    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    if (goteo) window.addEventListener("pointerdown", onDown, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointerdown", onDown);
    };
  }, [goteo]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className}`}
    />
  );
}
