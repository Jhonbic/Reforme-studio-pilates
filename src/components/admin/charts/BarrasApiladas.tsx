"use client";

import { useEffect, useRef, useState } from "react";

export type SerieApilada = {
  nombre: string;
  color: string;
  /** Series con la misma `pila` se apilan en una columna; pilas distintas van
   *  una al lado de la otra dentro del mismo grupo («entran» / «salen»). */
  pila: string;
};

type Props = {
  datos: { label: string; valores: number[] }[];
  /** En el mismo orden que `valores`. */
  series: SerieApilada[];
  /** Para el nombre accesible: «…por mes». */
  categoria?: string;
};

// Píxeles reales, como `GroupedBars` y `LineChart`: con un viewBox fijo +
// `w-full` el SVG se estiraba con la tarjeta y el texto salía al triple.
const M = { top: 12, right: 10, bottom: 28, left: 34 };
const FUENTE = 11;

function altoPara(ancho: number) {
  if (ancho < 480) return 220;
  if (ancho < 900) return 250;
  return 260;
}

/** Paso «redondo» para el eje (1, 2, 5, 10…). Son personas: nunca decimales. */
function pasoEntero(max: number) {
  const bruto = Math.max(max, 1) / 4;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const norm = bruto / mag;
  return Math.max(1, (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag);
}

/**
 * Barras apiladas por grupo: copia de la gráfica de «Altas y bajas por mes» de
 * `admingymdemo` (allí con Chart.js; aquí SVG propio, como el resto del panel).
 *
 * Cada grupo (un mes) lleva una columna por pila, juntas para que se lean como
 * un par: lo que entra (nuevos + regresos) y lo que sale (bajas).
 *
 * - El ancho de las barras depende de cuántos grupos hay (como en la demo):
 *   con un tope pensado para 12 meses, en 3 o 6 quedaban finitas y perdidas.
 * - Las series que valen cero en todo el periodo no se pintan ni salen en la
 *   leyenda.
 */
export default function BarrasApiladas({ datos, series, categoria = "mes" }: Props) {
  const [activo, setActivo] = useState<{ g: number; pila: string } | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(720);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = e.contentRect.width;
      if (w > 0) setAncho(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const visibles = series
    .map((s, i) => ({ ...s, i }))
    .filter((s) => datos.some((d) => d.valores[s.i] > 0));
  const pilas = [...new Set(visibles.map((s) => s.pila))];

  const W = ancho;
  const H = altoPara(W);
  const PW = Math.max(W - M.left - M.right, 10);
  const PH = H - M.top - M.bottom;

  const totalPila = (d: { valores: number[] }, pila: string) =>
    visibles.filter((s) => s.pila === pila).reduce((t, s) => t + d.valores[s.i], 0);
  const max = Math.max(1, ...datos.flatMap((d) => pilas.map((p) => totalPila(d, p))));
  const paso = pasoEntero(max);
  const techo = Math.ceil(max / paso) * paso;
  const y = (v: number) => M.top + PH - (v / techo) * PH;
  const ticks: number[] = [];
  for (let v = 0; v <= techo; v += paso) ticks.push(v);

  const anchoGrupo = PW / Math.max(datos.length, 1);
  const grosor = Math.min(
    datos.length <= 3 ? 56 : datos.length <= 6 ? 44 : datos.length <= 12 ? 28 : 18,
    (anchoGrupo * 0.7) / Math.max(pilas.length, 1),
  );
  const cadaN = Math.max(1, Math.ceil((datos.length * 40) / PW));

  const tooltip = activo && {
    label: datos[activo.g].label,
    filas: visibles.filter((s) => s.pila === activo.pila).map((s) => ({ ...s, v: datos[activo.g].valores[s.i] })),
  };

  return (
    <div>
      <div ref={caja} className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="block max-w-full"
          role="img"
          aria-label={`${visibles.map((s) => s.nombre).join(", ")} por ${categoria}`}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} y1={y(t)} x2={W - M.right} y2={y(t)} stroke="#e8e1d9" strokeWidth="1" />
              <text x={M.left - 8} y={y(t) + 4} textAnchor="end" className="fill-verde-300" fontSize={FUENTE}>
                {t}
              </text>
            </g>
          ))}

          {datos.map((d, g) => {
            const centro = M.left + g * anchoGrupo + anchoGrupo / 2;
            const x0 = centro - (grosor * pilas.length + 2 * (pilas.length - 1)) / 2;
            return (
              <g key={d.label}>
                {pilas.map((pila, k) => {
                  let base = 0;
                  const resaltada = activo?.g === g && activo.pila === pila;
                  return (
                    <g
                      key={pila}
                      onPointerEnter={() => setActivo({ g, pila })}
                      onPointerLeave={() => setActivo(null)}
                      className="[transition:opacity_.35s_var(--ease-smooth)] motion-reduce:transition-none"
                      opacity={activo === null || resaltada ? 1 : 0.35}
                    >
                      {/* Zona de puntero a toda altura: una barra de 0 también
                          tiene que poder enseñar su «0» en el tooltip. */}
                      <rect x={x0 + k * (grosor + 2)} y={M.top} width={grosor} height={PH} fill="transparent" />
                      {visibles
                        .filter((s) => s.pila === pila)
                        .map((s) => {
                          const v = d.valores[s.i];
                          const y1 = y(base + v);
                          const alto = y(base) - y1;
                          base += v;
                          return v > 0 ? (
                            <rect
                              key={s.nombre}
                              x={x0 + k * (grosor + 2)}
                              y={y1}
                              width={grosor}
                              height={alto}
                              rx="2"
                              fill={s.color}
                              stroke="#fff"
                              strokeWidth="0.75"
                            />
                          ) : null;
                        })}
                    </g>
                  );
                })}
                <text
                  x={centro}
                  y={H - 9}
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

        {tooltip && (
          <div className="pointer-events-none absolute right-0 top-0 z-10 rounded-lg border border-beige bg-white px-3 py-2 shadow-lift">
            <p className="text-xs text-verde-300">{tooltip.label}</p>
            {tooltip.filas.map((f) => (
              <p key={f.nombre} className="flex items-center gap-2 text-sm text-verde">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[2px]" style={{ background: f.color }} />
                {f.nombre}: <span className="font-cifra font-bold">{f.v}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Leyenda abajo, como en la demo. El color nunca va solo: el nombre al
          lado, y el número exacto en el tooltip y en el detalle por mes. */}
      <ul className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1">
        {visibles.map((s) => (
          <li key={s.nombre} className="flex items-center gap-2 text-xs text-verde-700">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[2px]" style={{ background: s.color }} />
            {s.nombre}
          </li>
        ))}
      </ul>
    </div>
  );
}
