"use client";

import { useState } from "react";
import { fmt, type FormatoValor } from "@/lib/admin/format";

export type PorcionDona = {
  label: string;
  value: number;
  color: string;
};

type Props = {
  datos: PorcionDona[];
  /** Cifra grande en el centro */
  totalEtiqueta: string;
  totalValor: string;
  /** Nombre del formato (no la función: cruza servidor→cliente) */
  formato: FormatoValor;
};

const TAM = 180;
const R_EXT = 78;
const R_INT = 52;
const C = TAM / 2;
/** Hueco de superficie entre porciones, en grados. */
const HUECO = 1.6;

function polar(r: number, grados: number) {
  const rad = ((grados - 90) * Math.PI) / 180;
  return [C + r * Math.cos(rad), C + r * Math.sin(rad)];
}

function arco(desde: number, hasta: number) {
  const [x1, y1] = polar(R_EXT, desde);
  const [x2, y2] = polar(R_EXT, hasta);
  const [x3, y3] = polar(R_INT, hasta);
  const [x4, y4] = polar(R_INT, desde);
  const largo = hasta - desde > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${R_EXT} ${R_EXT} 0 ${largo} 1 ${x2} ${y2} L ${x3} ${y3} A ${R_INT} ${R_INT} 0 ${largo} 0 ${x4} ${y4} Z`;
}

/**
 * Dona para repartos de UN total (de qué se compone la facturación).
 * Máximo 4 porciones: es el límite que aguanta la paleta manteniendo las
 * porciones distinguibles entre sí en daltonismo. Una quinta categoría se
 * agrupa en "Otros", no se le inventa un color.
 */
export default function Donut({
  datos,
  totalEtiqueta,
  totalValor,
  formato,
}: Props) {
  const [activo, setActivo] = useState<number | null>(null);
  const total = datos.reduce((t, d) => t + d.value, 0);

  // El ángulo de arranque de cada porción se calcula desde la suma de las
  // anteriores, sin ir acumulando en una variable externa: mutar durante el
  // render puede dar resultados distintos entre renders.
  const porciones = datos.map((d, i) => {
    const acumuladoPrevio = datos
      .slice(0, i)
      .reduce((t, x) => t + x.value, 0);
    const desde = (acumuladoPrevio / total) * 360;
    const barrido = (d.value / total) * 360;
    return { ...d, desde, hasta: desde + barrido, barrido };
  });

  return (
    /* ⚠️ `@container` + variantes `@lg:`, NO `sm:`.
       Los breakpoints normales miden la VENTANA, no la tarjeta: con `sm:flex-row`
       esto se ponía en paralelo en cuanto la pantalla pasaba de 640px, aunque la
       tarjeta midiera 390px — el donut y la leyenda no cabían y los importes se
       salían por el borde. `@lg` (512px) es el ancho mínimo real en el que caben
       el donut (176px) y una fila de leyenda completa. */
    <div className="@container">
      <div className="flex flex-col items-center gap-5 @lg:flex-row @lg:gap-6">
      <svg
        viewBox={`0 0 ${TAM} ${TAM}`}
        className="w-40 shrink-0 @lg:w-44"
        role="img"
        aria-label={totalEtiqueta}
      >
        {porciones.map((p, i) => (
          <path
            key={p.label}
            d={arco(p.desde + HUECO / 2, p.hasta - HUECO / 2)}
            fill={p.color}
            // Sin transición el cambio de opacidad es instantáneo y se lee como
            // un flash al pasar el ratón entre porciones. `--ease-smooth` es la
            // misma curva que usan las animaciones de la web pública.
            className="[transition:opacity_.35s_var(--ease-smooth)] motion-reduce:transition-none"
            opacity={activo === null || activo === i ? 1 : 0.35}
            onPointerEnter={() => setActivo(i)}
            onPointerLeave={() => setActivo(null)}
          />
        ))}
        <text
          x={C}
          y={C - 4}
          textAnchor="middle"
          className="fill-verde font-display"
          fontSize="17"
        >
          {activo === null
            ? totalValor
            : fmt(porciones[activo].value, "monedaCorta")}
        </text>
        <text
          x={C}
          y={C + 12}
          textAnchor="middle"
          className="fill-verde-300"
          fontSize="8"
        >
          {activo === null ? totalEtiqueta : porciones[activo].label}
        </text>
      </svg>

      {/* Leyenda con valor y porcentaje escritos: el color nunca va solo, y
          además resuelve el aviso de contraste del dorado */}
      <ul className="w-full space-y-2.5">
        {porciones.map((p, i) => (
          <li
            key={p.label}
            className="flex items-center gap-2.5 text-sm"
            onPointerEnter={() => setActivo(i)}
            onPointerLeave={() => setActivo(null)}
          >
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
              style={{ background: p.color }}
            />
            <span className="min-w-0 flex-1 text-verde-700">{p.label}</span>
            <span className="shrink-0 tabular-nums text-verde">
              {fmt(p.value, formato)}
            </span>
            <span className="w-12 shrink-0 text-right tabular-nums text-verde-300">
              {((p.value / total) * 100).toFixed(0)} %
            </span>
          </li>
        ))}
      </ul>
      </div>
    </div>
  );
}
