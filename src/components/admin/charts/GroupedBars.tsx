"use client";

import { useEffect, useRef, useState } from "react";
import { fmt, type FormatoValor } from "@/lib/admin/format";

export type GrupoBarras = {
  label: string;
  valores: number[];
};

type Props = {
  datos: GrupoBarras[];
  /** Máximo 2-4. El orden fija el color y NO se recicla. */
  series: { nombre: string; color: string }[];
  /** Nombre del formato (no la función: cruza servidor→cliente) */
  formato: FormatoValor;
  /** Formato de las marcas del eje Y. Por defecto, moneda abreviada. */
  formatoEje?: FormatoValor;
};

// Se dibuja en PÍXELES REALES: mismo motivo que en `LineChart`. Con un viewBox
// fijo + `w-full` el SVG se estira con el contenedor y, en una tarjeta a ancho
// completo, las barras y el texto salían al triple de tamaño.
const M = { top: 14, right: 14, bottom: 30, left: 56 };
const FUENTE = 11;
/** Hueco de superficie entre barras contiguas, en píxeles. */
const SEPARACION = 3;

/** Alto según el ancho disponible: proporción cómoda sin pasarse en escritorio. */
function altoPara(ancho: number) {
  if (ancho < 480) return 210;
  if (ancho < 900) return 250;
  return 290;
}

function pasoBonito(rango: number, objetivo: number) {
  const bruto = rango / objetivo;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const norm = bruto / mag;
  const paso = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return paso * mag;
}

/**
 * Barras agrupadas. Ambas series comparten UN eje — es el motivo de que aquí
 * solo entren magnitudes de la misma unidad (pesos con pesos). Dos escalas
 * distintas en el mismo gráfico serían un doble eje, y eso no se hace nunca.
 */
export default function GroupedBars({
  datos,
  series,
  formato,
  formatoEje = "monedaCorta",
}: Props) {
  const [activo, setActivo] = useState<{ g: number; s: number } | null>(null);
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

  const max = Math.max(...datos.flatMap((d) => d.valores));
  const paso = pasoBonito(max, 4);
  const techo = Math.ceil(max / paso) * paso;

  const anchoGrupo = PW / datos.length;
  const anchoBarra = Math.max(
    (anchoGrupo * 0.72 - SEPARACION * (series.length - 1)) / series.length,
    1,
  );

  const y = (v: number) => M.top + PH - (v / techo) * PH;

  const ticks: number[] = [];
  for (let v = 0; v <= techo + 1; v += paso) ticks.push(v);

  // Etiquetas del eje X: se muestran de N en N según lo que quepa (~34px cada
  // una). En móvil se salta alguna; en escritorio caben los 12 meses.
  const cadaN = Math.max(1, Math.ceil((datos.length * 34) / PW));

  const punto =
    activo !== null
      ? {
          label: datos[activo.g].label,
          serie: series[activo.s].nombre,
          valor: datos[activo.g].valores[activo.s],
          color: series[activo.s].color,
        }
      : null;

  return (
    <div>
      {/* Leyenda: siempre presente con 2+ series, para que la identidad no
          dependa solo del color */}
      <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {series.map((s) => (
          <li key={s.nombre} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-[2px]"
              style={{ background: s.color }}
            />
            <span className="text-verde-700">{s.nombre}</span>
          </li>
        ))}
      </ul>

      <div ref={caja} className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="block max-w-full"
          role="img"
          aria-label={`${series.map((s) => s.nombre).join(" y ")} por mes`}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={M.left}
                y1={y(t)}
                x2={W - M.right}
                y2={y(t)}
                stroke="#e8e1d9"
                strokeWidth="1"
              />
              <text
                x={M.left - 8}
                y={y(t) + 4}
                textAnchor="end"
                className="fill-verde-300"
                fontSize={FUENTE}
              >
                {fmt(t, formatoEje)}
              </text>
            </g>
          ))}

          {datos.map((d, g) => {
            const x0 =
              M.left + g * anchoGrupo + (anchoGrupo - anchoGrupo * 0.72) / 2;
            return (
              <g key={d.label}>
                {d.valores.map((v, s) => {
                  const bx = x0 + s * (anchoBarra + SEPARACION);
                  const by = y(v);
                  const alto = M.top + PH - by;
                  const resaltado =
                    activo !== null && activo.g === g && activo.s === s;
                  return (
                    <rect
                      key={s}
                      x={bx}
                      y={by}
                      width={anchoBarra}
                      height={Math.max(alto, 0)}
                      // Extremo redondeado solo arriba; la base queda anclada
                      rx="2"
                      fill={series[s].color}
                      opacity={activo === null || resaltado ? 1 : 0.45}
                      onPointerEnter={() => setActivo({ g, s })}
                      onPointerLeave={() => setActivo(null)}
                    />
                  );
                })}
                <text
                  x={x0 + (anchoGrupo * 0.72) / 2}
                  y={H - 10}
                  textAnchor="middle"
                  className="fill-verde-300"
                  fontSize={FUENTE}
                  opacity={g % cadaN === 0 ? 1 : 0}
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>

        {punto && (
          <div className="pointer-events-none absolute right-0 top-0 z-10 rounded-lg border border-beige bg-white px-3 py-2 shadow-lift">
            <p className="text-xs text-verde-300">{punto.label}</p>
            <p className="flex items-center gap-2 font-display text-base tabular-nums text-verde">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-[2px]"
                style={{ background: punto.color }}
              />
              {fmt(punto.valor, formato)}
            </p>
            <p className="text-xs text-verde-300">{punto.serie}</p>
          </div>
        )}
      </div>
    </div>
  );
}
