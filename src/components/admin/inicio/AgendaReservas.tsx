"use client";

import { useMemo, useState } from "react";
import { DIAS_CORTOS, diaLargo, diaSemana, sumarDias } from "@/lib/admin/horario";
import { MESES_LARGOS } from "@/lib/admin/periodo";
import { normalizar } from "@/lib/validacion";

export type ClaseDelMes = {
  id: string;
  fecha: string;
  horaInicio: string;
  tipo: string;
  instructora: string;
  cancelada: boolean;
  /** Quién la reservó, por orden alfabético. */
  personas: string[];
};

type Dia = { fecha: string; numero: number; total: number; esHoy: boolean };

/** `"2026-10"` + desplazamiento en meses → `"2026-11"`. */
function mesMas(mes: string, n: number): string {
  const [a, m] = mes.split("-").map(Number);
  const t = a * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}

/**
 * Calendario del mes + clases del día. Copia del `SesionesPanel` de
 * JainSportBox (calendario a la izquierda con el total de cada día, bloques
 * desplegables a la derecha), con los colores de Reforme y RESERVAS en vez
 * de asistencias.
 *
 * A diferencia de Jain, deja ir al mes siguiente: aquí lo que cuenta son
 * reservas, y las de la semana que viene ya existen. El rango que se puede
 * mirar es el que viaja desde el servidor (el mes anterior, este y el
 * siguiente).
 */
export default function AgendaReservas({ clases, hoy }: { clases: ClaseDelMes[]; hoy: string }) {
  const mesHoy = hoy.slice(0, 7);
  const [offset, setOffset] = useState(0);
  const [seleccionado, setSeleccionado] = useState<string>(hoy);
  const [busqueda, setBusqueda] = useState("");

  const mes = mesMas(mesHoy, offset);
  const [anio, numMes] = mes.split("-").map(Number);
  const nombreMes = `${MESES_LARGOS[numMes - 1]} ${anio}`;

  // Reservas por día, sin las clases canceladas: no van a ocurrir.
  const totales = useMemo(() => {
    const t = new Map<string, number>();
    for (const c of clases) {
      if (!c.cancelada) t.set(c.fecha, (t.get(c.fecha) ?? 0) + c.personas.length);
    }
    return t;
  }, [clases]);

  const semanas = useMemo(() => {
    const primero = `${mes}-01`;
    const ultimo = sumarDias(`${mesMas(mes, 1)}-01`, -1);
    const filas: (Dia | null)[][] = [];
    let fila: (Dia | null)[] = Array(diaSemana(primero)).fill(null);
    for (let f = primero; f <= ultimo; f = sumarDias(f, 1)) {
      fila.push({ fecha: f, numero: Number(f.slice(8)), total: totales.get(f) ?? 0, esHoy: f === hoy });
      if (fila.length === 7) {
        filas.push(fila);
        fila = [];
      }
    }
    if (fila.length) filas.push([...fila, ...Array(7 - fila.length).fill(null)]);
    return filas;
  }, [mes, totales, hoy]);

  const totalMes = useMemo(
    () => [...totales].filter(([f]) => f.startsWith(mes)).reduce((s, [, n]) => s + n, 0),
    [totales, mes],
  );

  const q = normalizar(busqueda.trim());
  const bloques = clases
    .filter((c) => c.fecha === seleccionado)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
    .map((c) => ({ ...c, visibles: q ? c.personas.filter((p) => normalizar(p).includes(q)) : c.personas }))
    .filter((c) => !q || c.visibles.length > 0);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-5">
      {/* ═══════════ COLUMNA IZQUIERDA · CALENDARIO ═══════════ */}
      <div className="lg:sticky lg:top-28 lg:col-span-2">
        <div className="rounded-2xl border border-beige bg-white p-4 shadow-card">
          {/* Navegación de mes */}
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setOffset((o) => o - 1)}
              disabled={offset <= -1}
              aria-label="Mes anterior"
              className="rounded-xl border border-beige p-2 transition-colors hover:border-dorado disabled:cursor-not-allowed disabled:opacity-30"
            >
              <svg className="h-5 w-5 text-verde-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="text-base font-bold capitalize text-verde">{nombreMes}</h3>
            <button
              type="button"
              onClick={() => setOffset((o) => o + 1)}
              disabled={offset >= 1}
              aria-label="Mes siguiente"
              className="rounded-xl border border-beige p-2 transition-colors hover:border-dorado disabled:cursor-not-allowed disabled:opacity-30"
            >
              <svg className="h-5 w-5 text-verde-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Encabezados días */}
          <div className="mb-2 grid grid-cols-7 gap-1">
            {DIAS_CORTOS.map((h) => (
              <div key={h} className="py-1 text-center text-xs font-bold uppercase tracking-wide text-verde-300">
                {h}
              </div>
            ))}
          </div>

          {/* Semanas */}
          {semanas.map((semana, si) => (
            <div key={si} className="mb-1 grid grid-cols-7 gap-1">
              {semana.map((dia, di) => {
                if (!dia) return <div key={di} />;
                const sel = dia.fecha === seleccionado;
                return (
                  <button
                    key={di}
                    type="button"
                    onClick={() => setSeleccionado(dia.fecha)}
                    aria-pressed={sel}
                    aria-label={`${diaLargo(dia.fecha)}: ${dia.total} ${dia.total === 1 ? "reserva" : "reservas"}`}
                    className={`relative flex min-h-[52px] flex-col items-center justify-center rounded-xl py-1.5 transition-all ${
                      sel
                        ? "bg-dorado text-verde-900 shadow-md"
                        : dia.esHoy
                          ? "bg-verde text-arena"
                          : dia.total > 0
                            ? "bg-dorado/10 text-verde hover:bg-dorado/20"
                            : "text-verde-300 hover:bg-arena"
                    }`}
                  >
                    <span className="text-sm font-bold leading-none">{dia.numero}</span>
                    {dia.total > 0 && (
                      <span
                        className={`mt-1 rounded-full px-1.5 py-0.5 text-xs font-semibold leading-none ${
                          sel
                            ? "bg-verde-900 text-dorado-light"
                            : dia.esHoy
                              ? "bg-verde-700 text-arena"
                              : "bg-dorado/30 text-verde-900"
                        }`}
                      >
                        {dia.total}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Total del mes */}
          <p className="mt-3 border-t border-beige pt-3 text-center text-xs text-verde-300">
            {totalMes} {totalMes === 1 ? "reserva" : "reservas"} este mes
          </p>
        </div>
      </div>

      {/* ═══════════ COLUMNA DERECHA · CLASES DEL DÍA ═══════════ */}
      <div className="lg:col-span-3">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-sm font-bold uppercase tracking-wide text-verde-700">
            Clases del {diaLargo(seleccionado)}
          </h4>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre…"
            aria-label="Buscar por nombre"
            className="w-full rounded-xl border border-beige bg-white px-4 py-2 text-sm text-verde placeholder:text-verde-300 focus:outline-none focus:ring-2 focus:ring-dorado/50 sm:w-64"
          />
        </div>

        {bloques.length > 0 ? (
          <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
            {bloques.map((b) => (
              <BloqueClase key={b.id} clase={b} visibles={b.visibles} abiertoInicial={!!q} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-verde-300">
            <svg className="mx-auto mb-3 h-10 w-10 text-beige" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="font-semibold text-verde-700">
              {q ? `Sin resultados para "${busqueda.trim()}"` : "Sin clases este día"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Copia de `BloqueCard` de Jain: cabecera desplegable con el recuento. */
function BloqueClase({
  clase: c,
  visibles,
  abiertoInicial,
}: {
  clase: ClaseDelMes;
  visibles: string[];
  abiertoInicial: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  // Al buscar se abren solos: si no, el resultado estaría escondido.
  const desplegado = abierto || abiertoInicial;

  return (
    <div className="overflow-hidden rounded-2xl border border-beige bg-white shadow-card">
      <button
        type="button"
        onClick={() => setAbierto(!desplegado)}
        aria-expanded={desplegado}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-arena"
      >
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <h3 className="truncate text-base font-bold text-verde">
              {c.horaInicio} · {c.tipo}
            </h3>
            {c.cancelada ? (
              <span className="shrink-0 whitespace-nowrap rounded-full bg-[color-mix(in_srgb,var(--color-estado-grave)_12%,transparent)] px-2.5 py-0.5 text-xs font-bold text-[var(--color-estado-grave)]">
                Cancelada
              </span>
            ) : (
              <span className="shrink-0 whitespace-nowrap rounded-full bg-dorado/20 px-2.5 py-0.5 text-xs font-bold text-verde-900">
                {visibles.length} {visibles.length === 1 ? "persona" : "personas"}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-verde-300">{c.instructora}</p>
        </div>
        <svg
          className={`h-4 w-4 shrink-0 text-verde-300 transition-transform duration-200 ${desplegado ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {desplegado && (
        <div className="border-t border-beige/60">
          {visibles.length === 0 ? (
            <p className="px-5 py-3 text-sm text-verde-300">Nadie ha reservado.</p>
          ) : (
            <ul className="divide-y divide-beige/60">
              {visibles.map((nombre, i) => (
                <li key={`${i}-${nombre}`} className="truncate px-5 py-2.5 text-sm font-medium text-verde-700">
                  {nombre}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
