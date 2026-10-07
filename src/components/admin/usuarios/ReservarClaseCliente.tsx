"use client";

import { useState, useTransition } from "react";
import Modal from "@/components/admin/Modal";
import { useToast } from "@/context/ToastContext";
import { reservar } from "@/lib/admin/acciones";
import { numero } from "@/lib/admin/format";
import { diaCorto, diaRelativo, numeroDia } from "@/lib/admin/horario";
import type { ClaseParaReservar, MembresiaConSaldo } from "@/lib/admin/types";

const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center justify-center gap-2 overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde";
const RESERVAR =
  "inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full bg-dorado px-4 text-sm font-medium text-verde-900 transition-colors duration-300 hover:bg-dorado-dark disabled:opacity-60";

/**
 * «Reservar clase» desde la ficha del cliente.
 *
 * Es el camino de recepción: alguien escribe «resérvame el jueves a las 7» y
 * se parte de la PERSONA, no de la clase. Antes había que ir a la agenda,
 * encontrar el día, abrir la clase y buscar al cliente en un desplegable.
 *
 * Cada clase dice si se puede y, si no, por qué, con la misma cuenta que hace
 * la base al reservar: lo que le queda en las membresías que cubren ESE día.
 * La base decide igual (`reservas_descuentan_clase`); esto evita el error.
 */
export default function ReservarClaseCliente({
  clienteId,
  nombre,
  clases,
  membresias,
  hoy,
}: {
  clienteId: string;
  nombre: string;
  clases: ClaseParaReservar[];
  membresias: MembresiaConSaldo[];
  hoy: string;
}) {
  const { mostrarAviso } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState("");
  const [enCurso, iniciar] = useTransition();

  const dias = [...new Set(clases.map((c) => c.fecha))];
  const [dia, setDia] = useState(dias[0] ?? hoy);
  const delDia = clases.filter((c) => c.fecha === dia);

  /** Lo que le queda de una modalidad para una fecha (`null` = sin plan ese día). */
  function quedan(fecha: string, tipo: "Reformer" | "Mat"): number | null {
    const cubren = membresias.filter((m) => m.inicio <= fecha && fecha <= m.vencimiento);
    if (cubren.length === 0) return null;
    return cubren.reduce((t, m) => t + (tipo === "Reformer" ? m.reformer : m.mat), 0);
  }

  function estadoDe(c: ClaseParaReservar): { motivo: string | null; detalle: string } {
    if (c.yaReservada) return { motivo: "✓ Ya reservada", detalle: "" };
    if (c.libres === 0) return { motivo: "Llena", detalle: "" };
    if (c.tipo === "Privada") return { motivo: null, detalle: "No descuenta del plan" };
    const n = quedan(c.fecha, c.tipo);
    if (n === null) return { motivo: "Sin plan ese día", detalle: "" };
    if (n <= 0) return { motivo: `Sin clases de ${c.tipo}`, detalle: "" };
    return { motivo: null, detalle: `Le ${n === 1 ? "queda" : "quedan"} ${numero(n)} de ${c.tipo}` };
  }

  /* Cuántas se pueden reservar cada día: lo que dice el número de la tira. */
  const reservables = (fecha: string) =>
    clases.filter((c) => c.fecha === fecha && estadoDe(c).motivo === null).length;

  function reservarClase(c: ClaseParaReservar) {
    setError("");
    iniciar(async () => {
      const r = await reservar(c.id, clienteId);
      if (!r.ok) return setError(r.error);
      mostrarAviso(`${nombre}: ${c.tipo} el ${diaRelativo(c.fecha, hoy).toLowerCase()} a las ${c.horaInicio}.`, "success");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setAbierto(true);
        }}
        className={BOTON}
      >
        <span className="control-sheen control-sheen--lento" aria-hidden="true" />
        Reservar clase
      </button>

      <Modal
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        cerrable={!enCurso}
        titulo={`Reservar clase · ${nombre}`}
        tamano="lg"
      >
        {dias.length === 0 ? (
          <p className="rounded-xl border border-beige bg-arena/50 px-4 py-6 text-center text-sm text-verde-300">
            No hay clases programadas en los próximos 14 días.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Día">
              {dias.map((d) => {
                const activo = d === dia;
                const n = reservables(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => setDia(d)}
                    className={`flex min-h-[56px] min-w-[52px] shrink-0 flex-col items-center justify-center rounded-xl border px-2 text-sm transition-colors duration-300 ${
                      activo
                        ? "border-dorado bg-dorado text-verde-900"
                        : "border-beige text-verde-700 hover:border-dorado"
                    }`}
                  >
                    <span className="text-xs capitalize">{diaCorto(d)}</span>
                    <span className="font-cifra font-bold">{numeroDia(d)}</span>
                    <span className={`text-[11px] ${activo ? "text-verde-900" : "text-verde-300"}`}>
                      {n === 0 ? "—" : `${n} ${n === 1 ? "libre" : "libres"}`}
                    </span>
                  </button>
                );
              })}
            </div>

            <h3 className="font-display text-xl text-verde first-letter:uppercase">{diaRelativo(dia, hoy)}</h3>

            <ul className="divide-y divide-beige rounded-xl border border-beige">
              {delDia.map((c) => {
                const e = estadoDe(c);
                return (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-verde">
                        <span className="font-cifra font-bold">{c.horaInicio}</span> · <span className="font-bold">{c.tipo}</span>
                        {c.tipo === "Privada" && <span className="text-verde-300"> · Sala de {c.sala}</span>}
                      </p>
                      <p className="text-xs text-verde-300">
                        {c.instructora} · {numero(c.libres)} {c.libres === 1 ? "cupo libre" : "cupos libres"}
                        {e.detalle && <span className="text-[var(--color-estado-ok)]"> · {e.detalle}</span>}
                      </p>
                    </div>
                    {e.motivo ? (
                      <span
                        className={`text-sm ${c.yaReservada ? "text-[var(--color-estado-ok)]" : "text-[var(--color-estado-aviso)]"}`}
                      >
                        {e.motivo}
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={enCurso}
                        onClick={() => reservarClase(c)}
                        className={RESERVAR}
                        aria-label={`Reservar ${c.tipo} de las ${c.horaInicio}, ${diaRelativo(c.fecha, hoy).toLowerCase()}`}
                      >
                        Reservar
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            {error && (
              <p role="alert" className="text-sm text-[var(--color-estado-grave)]">
                {error}
              </p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
