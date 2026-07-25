"use client";

import { useEffect, useRef } from "react";

// Dorado de marca en RGB para componer con alfa variable
const GOLD = "190, 155, 105";

type Bubble = { x: number; y: number };
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
 *  - Cadena de burbujas que sigue el cursor / dedo con inercia.
 *  - Ondas concéntricas ("goteo") al hacer clic o tocar.
 * Un único bucle rAF. Se desactiva por completo con prefers-reduced-motion.
 * pointer-events-none: nunca bloquea los botones del hero.
 */
export default function HeroFX({ className = "" }: { className?: string }) {
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

    // Estado del puntero
    const pointer = { x: -9999, y: -9999, inside: false };

    // Cadena de burbujas (siguen al cursor con retardo creciente)
    const BUBBLES = 3;
    const bubbles: Bubble[] = Array.from({ length: BUBBLES }, () => ({
      x: -9999,
      y: -9999,
    }));

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

    const onMove = (e: PointerEvent) => {
      const { x, y, rect } = localFromEvent(e.clientX, e.clientY);
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      pointer.x = x;
      pointer.y = y;
      pointer.inside = inside;
      // Al primer contacto, coloca la cadena para evitar un "salto" desde 0,0
      if (bubbles[0].x < -9000) {
        for (const b of bubbles) {
          b.x = x;
          b.y = y;
        }
      }
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

      // --- Cadena de burbujas siguiendo el puntero ---
      if (pointer.inside) {
        let px = pointer.x;
        let py = pointer.y;
        for (let i = 0; i < bubbles.length; i++) {
          const b = bubbles[i];
          const ease = 0.15 - i * 0.013; // cada eslabón, más lento (estela suave)
          b.x += (px - b.x) * ease;
          b.y += (py - b.y) * ease;
          px = b.x;
          py = b.y;

          const t = 1 - i / bubbles.length;
          const radius = 4 + t * 14;
          const alpha = 0.06 + t * 0.16;
          const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, radius);
          g.addColorStop(0, `rgba(${GOLD}, ${alpha})`);
          g.addColorStop(0.7, `rgba(${GOLD}, ${alpha * 0.5})`);
          g.addColorStop(1, `rgba(${GOLD}, 0)`);
          ctx.beginPath();
          ctx.arc(b.x, b.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
        }
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
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    const onLeave = () => (pointer.inside = false);
    window.addEventListener("blur", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("blur", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className}`}
    />
  );
}
