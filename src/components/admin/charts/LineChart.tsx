"use client";

import { useEffect, useRef, useState } from "react";
import { fmt, monedaCorta, type FormatoValor } from "@/lib/admin/format";

export type PuntoLinea = { label: string; value: number };

type Props = {
  datos: PuntoLinea[];
  /** Nombre del formato del tooltip (no la función: cruza servidor→cliente) */
  formato: FormatoValor;
  /** Nombre de la serie — el título de la tarjeta ya la nombra, así que no hay
   *  leyenda: con una sola serie sobra. */
  serie: string;
  /** Fondo sobre el que se dibuja. Solo cambia colores, nunca la geometría. */
  tono?: "claro" | "oscuro";
};

/**
 * Paleta por tono.
 *
 * ⚠️ En oscuro la serie va en DORADO DE MARCA, contra la nota de `globals.css`.
 * Esa nota mide el dorado sobre fondo arena (2.64:1) y como color para
 * DISTINGUIR series. Aquí no se cumple ninguna de las dos cosas: sobre
 * `verde-900` el dorado claro da 7.79:1, y con una sola serie no hay pares que
 * separar — el color no codifica categoría, solo tiene que verse. El verde de
 * datos (#31875C) daría 3.21:1 y encima es verde sobre verde. La tabla de datos
 * se mantiene, así que la garantía de accesibilidad no se relaja.
 */
const PALETA = {
  claro: {
    serie: "var(--color-chart-1)",
    area: "var(--color-chart-1)",
    rejilla: "#e8e1d9",
    ejes: "fill-verde-300",
    bordePunto: "#ffffff",
    tooltip: "border-beige bg-white",
    tooltipLabel: "text-verde-300",
    tooltipValor: "text-verde",
  },
  oscuro: {
    serie: "var(--color-dorado-light)",
    area: "var(--color-dorado)",
    // El beige puro sobre verde-900 domina el gráfico: la rejilla es contexto.
    rejilla: "color-mix(in srgb, var(--color-arena) 14%, transparent)",
    ejes: "fill-beige/70",
    bordePunto: "var(--color-verde-900)",
    tooltip: "border-verde-500 bg-verde-700",
    tooltipLabel: "text-beige/80",
    tooltipValor: "text-arena",
  },
} as const;

// El SVG se dibuja en PÍXELES REALES, no en un lienzo escalado.
//
// ⚠️ Gotcha: con un viewBox fijo + `w-full`, el SVG se estira uniformemente con
// el contenedor. En una tarjeta a ancho completo (~1400px) el factor era ×3.9:
// el alto se iba a ~740px y las etiquetas de 8 unidades salían a 31px. Por eso
// aquí se mide el ancho y el viewBox se ajusta 1:1 → el texto mide lo que dice.
const M = { top: 14, right: 14, bottom: 30, left: 56 };
const FUENTE = 11;

/** Alto según el ancho disponible: proporción cómoda sin pasarse en escritorio. */
function altoPara(ancho: number) {
  if (ancho < 480) return 200;
  if (ancho < 900) return 240;
  return 280;
}

/** Escalón "bonito" para los ejes: 1, 2, 5 × 10^n. */
function pasoBonito(rango: number, objetivo: number) {
  const bruto = rango / objetivo;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const norm = bruto / mag;
  const paso = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return paso * mag;
}

export default function LineChart({
  datos,
  formato,
  serie,
  tono = "claro",
}: Props) {
  const c = PALETA[tono];
  // El id del degradado lleva el tono: dos gráficos con tonos distintos en la
  // misma página compartirían el `<defs>` y uno se pintaría con el del otro.
  const idArea = `areaLinea-${tono}`;
  const [activo, setActivo] = useState<number | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  // Ancho de partida para el render del servidor y el primer render del
  // cliente (idénticos → sin desajuste de hidratación). Se corrige al medir.
  const [ancho, setAncho] = useState(720);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const ro = new ResizeObserver(([entrada]) => {
      const w = entrada.contentRect.width;
      if (w > 0) setAncho(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const W = ancho;
  const H = altoPara(W);
  const PW = Math.max(W - M.left - M.right, 10);
  const PH = H - M.top - M.bottom;

  const max = Math.max(...datos.map((d) => d.value));
  const paso = pasoBonito(max, 4);
  const techo = Math.ceil(max / paso) * paso;

  const x = (i: number) =>
    M.left + (datos.length === 1 ? PW / 2 : (i / (datos.length - 1)) * PW);
  const y = (v: number) => M.top + PH - (v / techo) * PH;

  const linea = datos.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const area = `${M.left},${M.top + PH} ${linea} ${x(datos.length - 1)},${M.top + PH}`;

  const ticks: number[] = [];
  for (let v = 0; v <= techo + 1; v += paso) ticks.push(v);

  // Etiquetas del eje X: se muestran de N en N según lo que quepa (~34px por
  // etiqueta). En móvil sale una de cada dos o tres; en escritorio, todas.
  const cadaN = Math.max(1, Math.ceil((datos.length * 34) / PW));

  // Índice más cercano al puntero, ya en píxeles del propio SVG.
  function alMover(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - r.left - M.left) / PW;
    const i = Math.round(rel * (datos.length - 1));
    setActivo(Math.min(datos.length - 1, Math.max(0, i)));
  }

  const punto = activo !== null ? datos[activo] : null;
  // El tooltip mide ~110px: se clava dentro de la tarjeta para que no se salga
  // por los bordes en el primer y el último mes.
  const tooltipX =
    activo !== null ? Math.min(Math.max(x(activo), 60), W - 60) : 0;

  return (
    <div ref={caja} className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="block max-w-full touch-pan-y"
        role="img"
        aria-label={`${serie} por mes`}
        onPointerMove={alMover}
        onPointerLeave={() => setActivo(null)}
      >
        <defs>
          <linearGradient id={idArea} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.area} stopOpacity="0.22" />
            <stop offset="100%" stopColor={c.area} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Rejilla: recesiva, nunca compite con el dato */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={M.left}
              y1={y(t)}
              x2={W - M.right}
              y2={y(t)}
              stroke={c.rejilla}
              strokeWidth="1"
            />
            <text
              x={M.left - 8}
              y={y(t) + 4}
              textAnchor="end"
              className={c.ejes}
              fontSize={FUENTE}
            >
              {monedaCorta(t)}
            </text>
          </g>
        ))}

        <polygon points={area} fill={`url(#${idArea})`} />
        <polyline
          points={linea}
          fill="none"
          stroke={c.serie}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {datos.map((d, i) => (
          <text
            key={d.label + i}
            x={x(i)}
            y={H - 10}
            textAnchor="middle"
            className={c.ejes}
            fontSize={FUENTE}
            opacity={i % cadaN === 0 ? 1 : 0}
          >
            {d.label}
          </text>
        ))}

        {/* Cruceta + marcador del punto activo */}
        {activo !== null && (
          <g>
            <line
              x1={x(activo)}
              y1={M.top}
              x2={x(activo)}
              y2={M.top + PH}
              stroke={c.serie}
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.5"
            />
            <circle
              cx={x(activo)}
              cy={y(datos[activo].value)}
              r="4.5"
              fill={c.serie}
              stroke={c.bordePunto}
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {/* Tooltip en HTML: texto nítido y estilable, encima del SVG */}
      {punto && (
        <div
          className={`pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border px-3 py-2 shadow-lift ${c.tooltip}`}
          style={{ left: tooltipX }}
        >
          <p className={`text-xs ${c.tooltipLabel}`}>{punto.label}</p>
          <p className={`font-display text-base tabular-nums ${c.tooltipValor}`}>
            {fmt(punto.value, formato)}
          </p>
        </div>
      )}
    </div>
  );
}
