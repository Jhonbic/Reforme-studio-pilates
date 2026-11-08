"use client";

import { useState } from "react";
import { DIAS_CORTOS, numeroDia } from "@/lib/admin/horario";
import type { ClasePasada, ClaseParaCliente } from "@/lib/cliente/datos";
import {
  calendarioMes,
  MESES_HISTORIAL,
  moverMes,
  tomadasEnMes,
  type MarcaDia,
} from "@/lib/cliente/inicio";

const NOMBRE_MES = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" });
const DIA_MES = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", timeZone: "UTC" });

function nombreMes(mes: string): string {
  const t = NOMBRE_MES.format(new Date(`${mes}-01T00:00:00Z`)).replace(" de ", " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Cómo se pinta cada marca. Nunca solo por color: relleno, trazo o anillo
 *  distintos, y el nombre accesible lo dice con palabras. */
const ESTILO: Record<MarcaDia, string> = {
  asistio: "bg-dorado text-verde-900",
  "sin-marcar": "bg-dorado/25 text-verde",
  "no-vino": "border border-dashed border-verde-300 text-verde-300 line-through",
  proxima: "ring-1 ring-inset ring-dorado text-verde",
};

const TEXTO: Record<MarcaDia, string> = {
  asistio: "asististe",
  "sin-marcar": "clase tomada, sin marcar",
  "no-vino": "no viniste",
  proxima: "clase reservada",
};

const LEYENDA: { marca: MarcaDia; texto: string }[] = [
  { marca: "asistio", texto: "Asististe" },
  { marca: "sin-marcar", texto: "Sin marcar" },
  { marca: "no-vino", texto: "No viniste" },
  { marca: "proxima", texto: "Reservada" },
];

/**
 * «Tus clases»: el calendario del mes con los días que vino, los que faltó y
 * los que tiene reservados, como «Mis asistencias» de la demo de adminGym.
 * Debajo, cuántas clases tomó ese mes (sin racha: decisión del usuario).
 *
 * Es una `<table>`: un calendario son filas (semanas) por columnas (días), y
 * así un lector de pantalla lo recorre como tal.
 */
export default function HistorialMes({
  historial,
  agenda,
  hoy,
}: {
  historial: ClasePasada[];
  agenda: ClaseParaCliente[];
  hoy: string;
}) {
  const actual = hoy.slice(0, 7);
  const minimo = moverMes(actual, -(MESES_HISTORIAL - 1));
  const [mes, setMes] = useState(actual);

  const semanas = calendarioMes(mes, hoy, historial, agenda);
  const tomadas = tomadasEnMes(mes, historial);
  const flecha =
    "inline-flex size-11 items-center justify-center rounded-full border border-beige text-verde transition-colors duration-300 hover:border-dorado disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-beige";

  return (
    <section aria-labelledby="tus-clases" className="rounded-3xl border border-beige bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 id="tus-clases" className="eyebrow text-dorado-tinta">
            Tus clases
          </h2>
          <p aria-live="polite" className="mt-1 font-display text-2xl text-verde">
            {nombreMes(mes)}
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            className={flecha}
            disabled={mes <= minimo}
            onClick={() => setMes(moverMes(mes, -1))}
            aria-label="Mes anterior"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button
            type="button"
            className={flecha}
            disabled={mes >= actual}
            onClick={() => setMes(moverMes(mes, 1))}
            aria-label="Mes siguiente"
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </div>

      <table className="mt-4 w-full table-fixed border-separate border-spacing-y-1 text-center">
        <caption className="sr-only">Tus clases de {nombreMes(mes)}</caption>
        <thead>
          <tr>
            {DIAS_CORTOS.map((d) => (
              <th key={d} scope="col" className="pb-1 text-[11px] font-normal uppercase tracking-wide text-verde-300">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {semanas.map((semana, i) => (
            <tr key={i}>
              {semana.map((celda, j) =>
                celda ? (
                  <td key={celda.fecha} className="p-0">
                    <span
                      className={`mx-auto flex size-9 items-center justify-center rounded-full font-cifra text-sm ${
                        celda.marca ? ESTILO[celda.marca] : "text-verde-700"
                      } ${celda.esHoy ? "outline outline-2 outline-offset-2 outline-verde" : ""}`}
                    >
                      <span aria-hidden="true">{numeroDia(celda.fecha)}</span>
                      <span className="sr-only">
                        {DIA_MES.format(new Date(`${celda.fecha}T00:00:00Z`))}
                        {celda.esHoy ? ", hoy" : ""}
                        {celda.marca ? `: ${TEXTO[celda.marca]}` : ""}
                        {celda.clases > 1 ? ` (${celda.clases} clases)` : ""}
                      </span>
                    </span>
                  </td>
                ) : (
                  <td key={`vacio-${j}`} aria-hidden="true" />
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-verde-700" aria-label="Leyenda">
        {LEYENDA.map((l) => (
          <li key={l.marca} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`inline-block size-3.5 rounded-full ${ESTILO[l.marca]}`} />
            {l.texto}
          </li>
        ))}
      </ul>

      <dl className="mt-5 border-t border-beige pt-4">
        <dt className="text-xs uppercase tracking-wider text-verde-300">
          En {nombreMes(mes).split(" ")[0].toLowerCase()}
        </dt>
        <dd className="mt-0.5 text-verde">
          <span className="font-cifra text-3xl font-light">{tomadas}</span>{" "}
          <span className="text-sm text-verde-700">{tomadas === 1 ? "clase" : "clases"}</span>
        </dd>
      </dl>
    </section>
  );
}
