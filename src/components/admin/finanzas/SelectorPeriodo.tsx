"use client";

import { useState } from "react";
import {
  MESES_LARGOS,
  esteMes,
  mesAnterior,
  periodoDeMes,
  type Periodo,
} from "@/lib/admin/periodo";

type Props = {
  periodo: Periodo;
  hoy: string;
  onCambio: (p: Periodo) => void;
};

type Panel = "mes" | "rango" | null;

const CHIP =
  "control-fx relative inline-flex min-h-[44px] items-center justify-center overflow-hidden rounded-full border px-4 text-sm transition-[border-color,box-shadow,color] duration-300";
const CHIP_REPOSO =
  "border-beige bg-white text-verde-700 hover:border-dorado hover:ring-2 hover:ring-dorado/25 focus-visible:border-dorado";
const CHIP_ACTIVO = "border-dorado bg-dorado text-verde-900";

const FECHA =
  "min-h-[44px] rounded-full border border-beige bg-white px-4 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado/60";

const igual = (a: Periodo, b: Periodo) =>
  a.desde === b.desde && a.hasta === b.hasta;

/**
 * El periodo de toda la pantalla de Finanzas: cifras, desgloses y libro.
 *
 * Idea tomada de JainSportBox (decisión del usuario): cuatro atajos y, para
 * «Por mes», una rejilla con los doce meses del año.
 *
 * ⚠️ **No guarda el periodo, solo lo escribe.** El par `[desde, hasta]` vive en
 * `PanelFinanzas` y es la única fuente de verdad; aquí solo se recuerda qué
 * panel está abierto. Qué atajo sale encendido se DEDUCE del par, así que no
 * puede quedarse «Este mes» encendido mientras se mira agosto.
 *
 * ⚠️ **Lo imposible no se valida: no se puede elegir.** Los meses futuros van
 * deshabilitados, y los calendarios del rango llevan `min`/`max` cruzados (el
 * «desde» no pasa del «hasta», y nada pasa de hoy). No hay ningún mensaje de
 * error porque no hay forma de llegar a un rango inválido.
 */
export default function SelectorPeriodo({ periodo, hoy, onCambio }: Props) {
  const [panel, setPanel] = useState<Panel>(null);
  const [anio, setAnio] = useState(Number(periodo.desde.slice(0, 4)));
  const anioHoy = Number(hoy.slice(0, 4));
  const mesHoy = Number(hoy.slice(5, 7)) - 1;

  const esEsteMes = igual(periodo, esteMes(hoy));
  const esMesAnterior = igual(periodo, mesAnterior(hoy));

  /* Qué chip va encendido. Un panel abierto manda (es lo que se está
     tocando); si no, lo que diga el par. */
  const activo: "este" | "anterior" | Panel =
    panel ??
    (esEsteMes
      ? "este"
      : esMesAnterior
        ? "anterior"
        : periodo.desde.endsWith("-01") &&
            periodo.desde.slice(0, 7) === periodo.hasta.slice(0, 7)
          ? "mes"
          : "rango");

  function atajo(p: Periodo) {
    setPanel(null);
    onCambio(p);
  }

  /* `min`/`max` limitan el calendario, pero al TECLEAR la fecha el navegador
     deja escribir cualquiera. Lo que no cuadra se ignora en vez de aceptarse:
     el campo vuelve al valor que había. */
  function rango(desde: string, hasta: string) {
    if (!desde || !hasta || desde > hasta || hasta > hoy) return;
    onCambio({ desde, hasta });
  }

  function chip(id: typeof activo, texto: string, alPulsar: () => void) {
    const encendido = activo === id;
    return (
      <button
        type="button"
        onClick={alPulsar}
        aria-pressed={encendido}
        className={`${CHIP} ${encendido ? CHIP_ACTIVO : CHIP_REPOSO}`}
      >
        {/* Sin barrido en el encendido: sobre dorado no se ve, y ya está
            señalado por su relleno. Misma regla que las pastillas de Usuarios. */}
        {!encendido && (
          <span className="control-sheen" aria-hidden="true" />
        )}
        {texto}
      </button>
    );
  }

  return (
    <div className="min-w-0 space-y-3">
      {/* 2×2 en móvil: con `flex-wrap`, «Rango» caía solo en una segunda fila
          y parecía un control de otra familia. */}
      <div
        role="group"
        aria-label="Periodo"
        className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
      >
        {chip("este", "Este mes", () => atajo(esteMes(hoy)))}
        {chip("anterior", "Mes anterior", () => atajo(mesAnterior(hoy)))}
        {chip("mes", "Por mes", () => setPanel(panel === "mes" ? null : "mes"))}
        {chip("rango", "Rango", () =>
          setPanel(panel === "rango" ? null : "rango"),
        )}
      </div>

      {panel === "mes" && (
        <div className="rounded-2xl border border-beige bg-white p-4">
          <div className="mb-3 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setAnio((a) => a - 1)}
              aria-label="Año anterior"
              className="flex size-11 items-center justify-center rounded-full border border-beige text-verde-700 transition-colors duration-300 hover:border-dorado"
            >
              ‹
            </button>
            <span className="font-cifra min-w-[4ch] text-center text-lg font-normal text-verde">
              {anio}
            </span>
            <button
              type="button"
              onClick={() => setAnio((a) => a + 1)}
              disabled={anio >= anioHoy}
              aria-label="Año siguiente"
              className="flex size-11 items-center justify-center rounded-full border border-beige text-verde-700 transition-colors duration-300 hover:border-dorado disabled:pointer-events-none disabled:opacity-30"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {MESES_LARGOS.map((nombre, m) => {
              const futuro = anio > anioHoy || (anio === anioHoy && m > mesHoy);
              const elegido =
                !futuro && igual(periodo, periodoDeMes(anio, m, hoy));
              return (
                <button
                  key={nombre}
                  type="button"
                  disabled={futuro}
                  aria-pressed={elegido}
                  onClick={() => onCambio(periodoDeMes(anio, m, hoy))}
                  className={`min-h-[44px] rounded-xl border px-2 text-sm capitalize transition-colors duration-300 disabled:cursor-not-allowed disabled:border-beige/60 disabled:text-verde-300/50 ${
                    elegido
                      ? "border-dorado bg-dorado text-verde-900"
                      : "border-beige text-verde-700 hover:border-dorado"
                  }`}
                >
                  {nombre.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {panel === "rango" && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-beige bg-white p-4">
          <label className="flex items-center gap-2 text-sm text-verde-700">
            Desde
            <input
              type="date"
              value={periodo.desde}
              max={periodo.hasta}
              onChange={(e) => rango(e.target.value, periodo.hasta)}
              className={FECHA}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-verde-700">
            Hasta
            <input
              type="date"
              value={periodo.hasta}
              min={periodo.desde}
              max={hoy}
              onChange={(e) => rango(periodo.desde, e.target.value)}
              className={FECHA}
            />
          </label>
        </div>
      )}
    </div>
  );
}
