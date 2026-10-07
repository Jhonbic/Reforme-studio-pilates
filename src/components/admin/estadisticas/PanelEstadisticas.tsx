"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import BarrasApiladas from "../charts/BarrasApiladas";
import { moneda, numero } from "@/lib/admin/format";
import type {
  CeldaHorario,
  FilaOcupacion,
  FilaPlan,
  FilaUsoPlan,
  MesMovimiento,
} from "@/lib/admin/estadisticas";
import { etiquetaMes } from "@/lib/admin/estadisticas";

type Props = {
  /** «2026-10», para marcar el mes en curso. */
  mesHoy: string;
  movimiento: MesMovimiento[];
  permanencia: { mesesMediana: number | null; valorPromedio: number | null };
  planes: FilaPlan[];
  edades: { total: number; edades: { etiqueta: string; n: number }[] };
  clases: {
    semanas: number;
    mapa: { dias: { indice: number; nombre: string }[]; horas: string[]; celdas: Record<string, CeldaHorario> };
    porInstructora: FilaOcupacion[];
    porModalidad: FilaOcupacion[];
    uso: FilaUsoPlan[];
    dormidos: { clienteId: string; nombre: string; hace: string }[];
    diasDormido: number;
  };
};

/* Las piezas de la demo con los colores de Reforme (como el dashboard). */
const TARJETA = "rounded-2xl border border-beige bg-white p-5 shadow-card";
const ROTULO = "text-xs font-bold uppercase tracking-widest text-verde-300";
const SUB = "mt-1 text-xs text-verde-300";

// Período de la gráfica de altas y bajas. La serie trae 24 meses y se recorta aquí.
const PERIODOS = [
  { meses: 3, label: "3 meses" },
  { meses: 6, label: "6 meses" },
  { meses: 12, label: "1 año" },
  { meses: 24, label: "2 años" },
];

/* Entra = verdes, sale = rojo (semántica de la demo). El verde de regresos es
   más claro que el de nuevos: misma pila, mismo tono, se distinguen por el
   nombre de la leyenda y el tooltip. Los tres tienen etiqueta escrita. */
const SERIES = [
  { nombre: "Nuevos", color: "var(--color-chart-1)", pila: "entran" },
  { nombre: "Regresos", color: "#7DBF97", pila: "entran" },
  { nombre: "Bajas", color: "var(--color-chart-3)", pila: "salen" },
];

/* Edad: una sola escala del verde de marca, de claro (jóvenes) a oscuro, como
   la demo hacía con su rojo. «Sin dato» en beige: no es un rango más. */
const COLOR_EDAD: Record<string, string> = {
  "Menos de 18": "#cfe0d4",
  "18–24": "#9fc2aa",
  "25–34": "#6d9c7e",
  "35–44": "#477a5b",
  "45–54": "#284435",
  "55 o más": "#152519",
  "Sin dato": "#e8e1d9",
};

const AVISO_PROVISIONAL =
  "Incluye vencidos de los últimos 30 días que todavía pueden renovar: el número puede subir.";

const formatoNum = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 1 });
const conSigno = (n: number, decimales = false) => {
  const v = decimales ? formatoNum(Math.abs(n)) : Math.abs(n);
  return n > 0 ? `+${v}` : n < 0 ? `−${v}` : "0";
};
const colorNeto = (n: number | null) =>
  n === null || n === 0
    ? "text-verde-300"
    : n > 0
      ? "text-[var(--color-estado-ok)]"
      : "text-[var(--color-estado-grave)]";

/**
 * Estadísticas: copia de la pantalla de `admingymdemo` (decisión del usuario,
 * oct 2026) con los colores de Reforme, más un cuarto bloque de clases propio
 * de un estudio de pilates.
 *
 * Todo llega calculado del servidor. Cambiar el periodo no pide nada: la
 * serie trae 24 meses y aquí se recorta (como la demo).
 */
export default function PanelEstadisticas(props: Props) {
  const { mesHoy, permanencia, planes, edades, clases } = props;
  const [meses, setMeses] = useState(12);
  const [detalleAbierto, setDetalleAbierto] = useState(false);

  // ── 1. Altas y bajas ──
  const movimiento = useMemo(() => props.movimiento.slice(-meses), [props.movimiento, meses]);

  const resumenMov = useMemo(() => {
    // El promedio de bajas solo usa meses CERRADOS: con bajas por confirmar el
    // número aún puede subir, y el mes en curso tiene sus vencimientos todos con
    // menos de 30 días — su «0 %» no es un dato sino falta de tiempo.
    const cerrados = movimiento.filter((m) => m.bajasPct !== null && !m.porConfirmar && m.mes !== mesHoy);
    return {
      entraron: movimiento.reduce((s, m) => s + m.altas + m.regresos, 0),
      salieron: movimiento.reduce((s, m) => s + m.bajas, 0),
      bajasPct: cerrados.length
        ? cerrados.reduce((s, m) => s + (m.bajasPct ?? 0), 0) / cerrados.length
        : null,
    };
  }, [movimiento, mesHoy]);

  // Del más reciente al más viejo: lo que se busca primero es lo último.
  const filasDetalle = [...movimiento].reverse().map((m) => ({
    ...m,
    neto: m.altas + m.regresos - m.bajas,
    enCurso: m.mes === mesHoy,
    provisional: m.porConfirmar > 0,
  }));

  const prom = (lista: typeof filasDetalle, f: (m: (typeof filasDetalle)[number]) => number) =>
    lista.length ? lista.reduce((s, m) => s + f(m), 0) / lista.length : null;
  const completos = filasDetalle.filter((m) => !m.enCurso);
  const cerrados = filasDetalle.filter((m) => !m.provisional && !m.enCurso);
  const promedioMes = {
    altas: prom(completos, (m) => m.altas),
    regresos: prom(completos, (m) => m.regresos),
    neto: prom(completos, (m) => m.neto),
    bajas: prom(cerrados, (m) => m.bajas),
  };

  // ── 3. Perfil ──
  const conPct = edades.edades
    .filter((f) => f.n > 0)
    .map((f) => ({
      ...f,
      color: COLOR_EDAD[f.etiqueta] ?? "#c9c9c9",
      pct: edades.total ? Math.round((f.n / edades.total) * 100) : 0,
    }));

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-verde">Estadísticas</h2>
        <p className="mt-1 text-verde-300">Cómo se mueven los clientes del estudio</p>
      </div>
      {/* Se dice una vez, arriba, y no en cada bloque. A diferencia de la demo
          no es una deducción desde los pagos: Reforme guarda las membresías. */}
      <p className="-mt-3 text-xs text-verde-300">
        Calculado a partir de las membresías registradas. Un cliente que renueva hasta 30 días
        después de vencer cuenta como que nunca se fue.
      </p>

      {/* ══ 1. Altas y bajas ══ */}
      <section className={TARJETA}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className={ROTULO}>Altas y bajas por mes</h3>
            <p className={SUB}>Quién entró y quién se fue cada mes</p>
          </div>
          {/* Sin «1 mes»: la gráfica es por mes y quedaría una sola barra que no
              compara nada. */}
          <div role="group" aria-label="Periodo" className="flex shrink-0 gap-1.5">
            {PERIODOS.map((p) => (
              <button
                key={p.meses}
                type="button"
                aria-pressed={meses === p.meses}
                onClick={() => setMeses(p.meses)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  meses === p.meses
                    ? "border-verde bg-verde text-arena"
                    : "border-beige bg-white text-verde-300 hover:border-dorado hover:text-verde-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {movimiento.length === 0 ? (
          <p className="py-16 text-center text-sm text-verde-300">Todavía no hay membresías registradas.</p>
        ) : (
          <>
            <BarrasApiladas
              datos={movimiento.map((m) => ({
                label: etiquetaMes(m.mes).split(" ")[0],
                valores: [m.altas, m.regresos, m.bajas],
              }))}
              series={SERIES}
            />

            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-beige pt-4">
              <div>
                <p className="font-cifra text-2xl font-bold text-verde">{resumenMov.entraron}</p>
                <p className="text-xs text-verde-300">
                  Entraron <span className="hidden sm:inline">(nuevos y regresos)</span>
                </p>
              </div>
              <div>
                <p className="font-cifra text-2xl font-bold text-verde">{resumenMov.salieron}</p>
                <p className="text-xs text-verde-300">Se fueron</p>
              </div>
              <div title="De cada 100 clientes activos al empezar el mes, cuántos se fueron en ese mes.">
                <p className="font-cifra text-2xl font-bold text-verde">
                  {resumenMov.bajasPct === null ? "—" : `${formatoNum(resumenMov.bajasPct)} %`}
                </p>
                <p className="text-xs text-verde-300">Bajas al mes, en promedio</p>
              </div>
            </div>

            {/* Detalle por mes: la misma serie que la gráfica (sigue al periodo),
                con el número exacto de cada barra y el promedio por mes. */}
            <button
              type="button"
              onClick={() => setDetalleAbierto(!detalleAbierto)}
              aria-expanded={detalleAbierto}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-verde-300 transition-colors hover:text-verde"
            >
              {detalleAbierto ? "Ocultar detalle" : "Ver detalle por mes"}
              <svg
                className={`h-4 w-4 transition-transform ${detalleAbierto ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {detalleAbierto && (
              <div className="-mx-5 mt-3 overflow-x-auto px-5">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-beige text-verde-300">
                      <th className="py-2 pr-2 text-left font-semibold">Mes</th>
                      <th className="px-2 py-2 text-right font-semibold">Nuevos</th>
                      <th className="px-2 py-2 text-right font-semibold">Regresos</th>
                      <th className="px-2 py-2 text-right font-semibold">Bajas</th>
                      <th className="hidden px-2 py-2 text-right font-semibold sm:table-cell">Activos al inicio</th>
                      <th className="px-2 py-2 text-right font-semibold" title="Bajas del mes ÷ activos al empezar el mes">
                        % bajas
                      </th>
                      <th className="py-2 pl-2 text-right font-semibold" title="Nuevos + regresos − bajas">
                        Neto
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-beige/60 font-cifra">
                    {filasDetalle.map((f) => (
                      <tr key={f.mes}>
                        <td className="whitespace-nowrap py-2 pr-2 font-sans text-verde-700">
                          {etiquetaMes(f.mes)}
                          {f.enCurso && <span className="text-verde-300"> · en curso</span>}
                        </td>
                        <td className="px-2 py-2 text-right text-verde-700">{f.altas}</td>
                        <td className="px-2 py-2 text-right text-verde-700">{f.regresos}</td>
                        <td className="px-2 py-2 text-right text-verde-700">
                          {f.bajas}
                          {f.provisional && (
                            <span className="text-verde-300" title={AVISO_PROVISIONAL}>
                              *
                            </span>
                          )}
                        </td>
                        <td className="hidden px-2 py-2 text-right text-verde-300 sm:table-cell">{f.activosInicio}</td>
                        <td className="px-2 py-2 text-right text-verde-700">
                          {f.bajasPct === null ? "—" : `${formatoNum(f.bajasPct)} %`}
                          {f.provisional && f.bajasPct !== null && (
                            <span className="text-verde-300" title={AVISO_PROVISIONAL}>
                              *
                            </span>
                          )}
                        </td>
                        <td className={`py-2 pl-2 text-right font-semibold ${colorNeto(f.neto)}`}>{conSigno(f.neto)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Mismos meses que la tarjeta «Bajas al mes»: así la fila y la
                      tarjeta dan siempre lo mismo. */}
                  <tfoot>
                    <tr
                      className="border-t border-beige font-cifra font-semibold text-verde"
                      title="Nuevos, regresos y neto: meses completos (sin el mes en curso). Bajas y %: meses cerrados (sin bajas por confirmar)."
                    >
                      <td className="whitespace-nowrap py-2 pr-2 font-sans">Promedio por mes</td>
                      <td className="px-2 py-2 text-right">{promedioMes.altas === null ? "—" : formatoNum(promedioMes.altas)}</td>
                      <td className="px-2 py-2 text-right">
                        {promedioMes.regresos === null ? "—" : formatoNum(promedioMes.regresos)}
                      </td>
                      <td className="px-2 py-2 text-right">{promedioMes.bajas === null ? "—" : formatoNum(promedioMes.bajas)}</td>
                      <td className="hidden px-2 py-2 text-right text-beige sm:table-cell">—</td>
                      <td className="px-2 py-2 text-right">
                        {resumenMov.bajasPct === null ? "—" : `${formatoNum(resumenMov.bajasPct)} %`}
                      </td>
                      <td className={`py-2 pl-2 text-right ${colorNeto(promedioMes.neto)}`}>
                        {promedioMes.neto === null ? "—" : conSigno(promedioMes.neto, true)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
                {filasDetalle.some((f) => f.provisional) && (
                  <p className="mt-2 text-xs text-verde-300">* {AVISO_PROVISIONAL}</p>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* ══ 2. Permanencia y planes ══ */}
      <section className={TARJETA}>
        <h3 className={`${ROTULO} mb-4`}>Permanencia y planes</h3>
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-arena p-4">
            <p className="text-xs text-verde-300">Un cliente típico se queda</p>
            <p className="mt-1 font-cifra text-3xl font-bold text-verde">
              {permanencia.mesesMediana === null
                ? "—"
                : `${formatoNum(permanencia.mesesMediana)} ${permanencia.mesesMediana === 1 ? "mes" : "meses"}`}
            </p>
            <p className={SUB}>La mitad de los clientes se quedó más que eso, contando hasta hoy</p>
          </div>
          <div className="rounded-xl bg-arena p-4">
            <p className="text-xs text-verde-300">Cada cliente deja en promedio</p>
            <p className="mt-1 font-cifra text-3xl font-bold text-verde">
              {permanencia.valorPromedio === null ? "—" : moneda(permanencia.valorPromedio)}
            </p>
            <p className={SUB}>Todo lo que pagó en membresías, hasta hoy</p>
          </div>
        </div>

        {planes.length === 0 ? (
          <p className="py-4 text-center text-sm text-verde-300">Sin membresías todavía.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-beige text-left text-xs text-verde-300">
                <th className="pb-2 font-semibold">Plan</th>
                <th className="pb-2 text-right font-semibold" title="Todas las veces que se vendió este plan, desde el primer registro">
                  Vendidos
                </th>
                <th className="pb-2 text-right font-semibold">Activos hoy</th>
                <th
                  className="pb-2 text-right font-semibold"
                  title="De los que se les venció este plan en el último año, cuántos volvieron a pagar antes de vencer o hasta 30 días después"
                >
                  Renuevan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-beige/60">
              {planes.map((p) => (
                <tr key={p.plan}>
                  <td className="py-2.5 font-semibold text-verde">{p.plan}</td>
                  <td className="py-2.5 text-right font-cifra font-semibold text-verde">{p.vendidos}</td>
                  <td className="py-2.5 text-right font-cifra text-verde-700">{p.activosHoy}</td>
                  <td className="py-2.5 text-right">
                    {p.renovacion === null ? (
                      <span className="text-beige">—</span>
                    ) : (
                      <>
                        <span className="font-cifra font-semibold text-verde">{Math.round(p.renovacion)} %</span>
                        <span className="ml-1 hidden text-xs text-verde-300 sm:inline">
                          ({p.renovaron} de {p.vencieron})
                        </span>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ══ 3. Perfil ══ */}
      <section className={TARJETA}>
        <h3 className={ROTULO}>Quiénes son</h3>
        <p className={`${SUB} mb-4`}>Los {edades.total} clientes activos hoy</p>
        {/* Solo edad: Reforme no pregunta el género en el alta ni en el
            registro (la demo sí, y lo pinta en una barra partida). */}
        <div>
          <p className="mb-3 text-sm font-semibold text-verde-700">Edad</p>
          {conPct.length === 0 ? (
            <p className="text-sm text-verde-300">Sin clientes activos hoy.</p>
          ) : (
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <DonaEdad porciones={conPct} total={edades.total} />
              <ul className="w-full min-w-0 max-w-md flex-1 space-y-1.5 text-sm">
                {conPct.map((f) => (
                  <li key={f.etiqueta} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: f.color }} aria-hidden="true" />
                    <span className="flex-1 truncate text-verde-700">{f.etiqueta}</span>
                    <span className="font-cifra text-xs text-verde-300">{f.n}</span>
                    <span className="w-12 text-right font-cifra font-semibold text-verde">{f.pct} %</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* ══ 4. Clases (propio de Reforme) ══ */}
      <BloqueClases clases={clases} />
    </div>
  );
}

/** Dona de la edad, como la de la demo: total en el centro, sin leyenda
 *  propia (la leyenda es la lista de al lado). */
function DonaEdad({
  porciones,
  total,
}: {
  porciones: { etiqueta: string; n: number; color: string; pct: number }[];
  total: number;
}) {
  const [activo, setActivo] = useState<number | null>(null);
  const T = 144;
  const C = T / 2;
  const RE = 68;
  const RI = 46;
  const polar = (r: number, g: number) => {
    const rad = ((g - 90) * Math.PI) / 180;
    return [C + r * Math.cos(rad), C + r * Math.sin(rad)];
  };
  const arco = (a: number, b: number) => {
    const [x1, y1] = polar(RE, a);
    const [x2, y2] = polar(RE, b);
    const [x3, y3] = polar(RI, b);
    const [x4, y4] = polar(RI, a);
    const l = b - a > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${RE} ${RE} 0 ${l} 1 ${x2} ${y2} L ${x3} ${y3} A ${RI} ${RI} 0 ${l} 0 ${x4} ${y4} Z`;
  };
  const suma = porciones.reduce((t, p) => t + p.n, 0);
  // El ángulo de cada porción sale de la suma de las anteriores, sin acumular
  // en una variable externa durante el render.
  const trozos = porciones.map((p, i) => {
    const desde = (porciones.slice(0, i).reduce((t, x) => t + x.n, 0) / suma) * 360;
    return { ...p, desde, hasta: desde + (p.n / suma) * 360 };
  });
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox={`0 0 ${T} ${T}`} className="h-full w-full" role="img" aria-label={`Edad de los ${total} clientes activos`}>
        {trozos.length === 1 ? (
          // Una sola porción es un anillo entero: un arco de 360° no se puede
          // dibujar (empieza y acaba en el mismo punto).
          <circle cx={C} cy={C} r={(RE + RI) / 2} fill="none" stroke={trozos[0].color} strokeWidth={RE - RI} />
        ) : (
          trozos.map((t, i) => (
            <path
              key={t.etiqueta}
              d={arco(t.desde, t.hasta)}
              fill={t.color}
              // Borde blanco de 2px entre porciones: separa tonos vecinos de la
              // misma escala (como la demo).
              stroke="#fff"
              strokeWidth="2"
              className="[transition:opacity_.35s_var(--ease-smooth)] motion-reduce:transition-none"
              opacity={activo === null || activo === i ? 1 : 0.4}
              onPointerEnter={() => setActivo(i)}
              onPointerLeave={() => setActivo(null)}
            >
              <title>{`${t.etiqueta}: ${t.n} (${t.pct} %)`}</title>
            </path>
          ))
        )}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-cifra text-2xl font-bold leading-none text-verde">
          {activo === null ? total : trozos[activo].n}
        </span>
        <span className="mt-1 text-[11px] text-verde-300">{activo === null ? "activos" : trozos[activo].etiqueta}</span>
      </div>
    </div>
  );
}

function BloqueClases({ clases }: { clases: Props["clases"] }) {
  const { mapa } = clases;
  const sinDatos = mapa.horas.length === 0;
  return (
    <section className={TARJETA}>
      <h3 className={ROTULO}>Clases</h3>
      {/* Son reservas, no asistencias: todavía no se registra quién viene. */}
      <p className={`${SUB} mb-5`}>
        Últimas {clases.semanas} semanas, sin canceladas · cuenta reservas, no asistencias
      </p>

      {sinDatos ? (
        <p className="py-10 text-center text-sm text-verde-300">No hubo clases en las últimas {clases.semanas} semanas.</p>
      ) : (
        <div className="space-y-8">
          {/* Mapa de horarios: responde a «¿abro otra clase a las 18:00 o quito
              la de las 9:00?». El color acompaña; el % va escrito. */}
          <div>
            <p className="mb-1 text-sm font-semibold text-verde-700">Ocupación por horario</p>
            <p className="mb-3 text-xs text-verde-300">Reservas sobre cupos de cada franja, de media</p>
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-1 text-xs">
                <thead>
                  <tr>
                    <th className="w-14" />
                    {mapa.dias.map((d) => (
                      <th key={d.indice} scope="col" className="px-1 py-1 text-center font-semibold uppercase tracking-wide text-verde-300">
                        {d.nombre}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mapa.horas.map((h) => (
                    <tr key={h}>
                      <th scope="row" className="pr-2 text-right font-cifra font-normal text-verde-300">
                        {h}
                      </th>
                      {mapa.dias.map((d) => {
                        const c = mapa.celdas[`${d.indice}|${h}`];
                        if (!c || c.ocupacion === null)
                          return (
                            <td key={d.indice} className="h-10 min-w-12 rounded-lg bg-arena/60 text-center text-beige">
                              —
                            </td>
                          );
                        /* Texto claro desde el 45 %: el fondo es el verde de marca
                           mezclado en esa proporción con el blanco cálido, y a
                           partir de ahí el texto oscuro ya no se distingue. */
                        const fuerte = c.ocupacion >= 45;
                        return (
                          <td
                            key={d.indice}
                            title={`${d.nombre} ${h}: ${c.reservas} reservas de ${c.cupos} cupos en ${c.clases} clases`}
                            className={`h-10 min-w-12 rounded-lg text-center font-cifra font-bold ${fuerte ? "text-arena" : "text-verde"}`}
                            style={{ background: `color-mix(in srgb, #284435 ${Math.max(8, c.ocupacion)}%, #F7F6F3)` }}
                          >
                            {c.ocupacion}%
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <TablaOcupacion titulo="Por instructora" filas={clases.porInstructora} />
            <TablaOcupacion titulo="Por modalidad" filas={clases.porModalidad} />
          </div>

          {/* Uso del plan: un plan que se usa muy por debajo de lo que incluye
              está mal dimensionado, o sus clientes se están enfriando. */}
          <div>
            <p className="mb-1 text-sm font-semibold text-verde-700">Uso del plan</p>
            <p className="mb-3 text-xs text-verde-300">Reservas por semana de cada cliente activo, frente a lo que incluye su plan</p>
            {clases.uso.length === 0 ? (
              <p className="text-sm text-verde-300">Sin clientes activos hoy.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-beige text-left text-xs text-verde-300">
                    <th className="pb-2 font-semibold">Plan</th>
                    <th className="pb-2 text-right font-semibold">Clientes</th>
                    <th className="pb-2 text-right font-semibold">Reservan / semana</th>
                    <th className="pb-2 text-right font-semibold">Incluye / semana</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-beige/60 font-cifra">
                  {clases.uso.map((u) => (
                    <tr key={u.plan}>
                      <td className="py-2.5 font-sans font-semibold text-verde">{u.plan}</td>
                      <td className="py-2.5 text-right text-verde-700">{u.clientes}</td>
                      <td className="py-2.5 text-right font-semibold text-verde">
                        {u.porSemana === null ? "—" : formatoNum(u.porSemana)}
                      </td>
                      <td className="py-2.5 text-right text-verde-300">
                        {u.incluyePorSemana === null ? "Ilimitadas" : formatoNum(u.incluyePorSemana)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Dormidos: plan vigente, pero ni reservas recientes ni próximas. La
          señal más temprana de que alguien no va a renovar. */}
      <div className="mt-8 overflow-hidden rounded-2xl border border-beige">
        <div className="flex items-center gap-2 border-b border-beige px-4 py-3">
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-verde">
            Con plan y sin reservar
            {clases.dormidos.length > 0 && (
              <span className="flex h-4 items-center rounded-full bg-dorado px-1.5 text-[10px] font-bold text-verde-900">
                {clases.dormidos.length}
              </span>
            )}
          </h4>
          <span className="ml-auto text-xs text-verde-300">±{clases.diasDormido} días</span>
        </div>
        {clases.dormidos.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-verde-300">Todos los clientes con plan están reservando</p>
        ) : (
          <ul className="max-h-[14rem] divide-y divide-beige overflow-y-auto">
            {clases.dormidos.map((d) => (
              <li key={d.clienteId} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-verde">{d.nombre}</p>
                  <p className="text-xs text-verde-300">{d.hace}</p>
                </div>
                <Link
                  href={`/admin/usuarios/${d.clienteId}`}
                  className="shrink-0 rounded-lg border border-beige bg-white px-3 py-1.5 text-xs font-semibold text-verde-700 transition-colors hover:border-dorado"
                >
                  Ver
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function TablaOcupacion({ titulo, filas }: { titulo: string; filas: FilaOcupacion[] }) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-verde-700">{titulo}</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-beige text-left text-xs text-verde-300">
            <th className="pb-2 font-semibold">{titulo.replace("Por ", "").replace(/^./, (c) => c.toUpperCase())}</th>
            <th className="pb-2 text-right font-semibold">Clases</th>
            <th className="pb-2 text-right font-semibold">Reservas</th>
            <th className="pb-2 text-right font-semibold">Ocupación</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-beige/60 font-cifra">
          {filas.map((f) => (
            <tr key={f.nombre}>
              <td className="py-2.5 font-sans font-semibold text-verde">{f.nombre}</td>
              <td className="py-2.5 text-right text-verde-700">{numero(f.clases)}</td>
              <td className="py-2.5 text-right text-verde-700">{numero(f.reservas)}</td>
              <td className="py-2.5 text-right font-semibold text-verde">{f.ocupacion === null ? "—" : `${f.ocupacion} %`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
