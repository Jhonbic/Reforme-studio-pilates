"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Direction = "up" | "left" | "right" | "scale";

type RevealProps = {
  children: ReactNode;
  /** Retardo en ms para escalonar la aparición */
  delay?: number;
  /** Dirección desde la que aparece el contenido */
  direction?: Direction;
  className?: string;
  as?: "div" | "section" | "li" | "article";
};

const hidden: Record<Direction, string> = {
  up: "opacity-0 translate-y-8",
  left: "opacity-0 -translate-x-10",
  right: "opacity-0 translate-x-10",
  scale: "opacity-0 scale-[0.94]",
};

/**
 * Revela su contenido con un desplazamiento suave cuando entra en viewport.
 * `direction` controla desde dónde aparece. Respeta prefers-reduced-motion.
 */
export default function Reveal({
  children,
  delay = 0,
  direction = "up",
  className = "",
  as = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Tag = as as "div";

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={`transition-all duration-[1000ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
        visible ? "opacity-100 translate-x-0 translate-y-0 scale-100" : hidden[direction]
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
