"use client";

import { useState, useTransition } from "react";
import Card from "@/components/admin/Card";
import Modal from "@/components/admin/Modal";
import { useToast } from "@/context/ToastContext";
import { copiarDiaHorario, guardarFranja } from "@/lib/admin/acciones";
import { fecha, numero } from "@/lib/admin/format";
import { finDe } from "@/lib/admin/horario";
import type { FranjaHorario, MiembroEquipo, Sala } from "@/lib/admin/types";
import PestanasClases from "./PestanasClases";

const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center gap-2 overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde";
const BOTON_PRIMARIO =
  "inline-flex min-h-[44px] items-center justify-center rounded-full bg-dorado px-5 text-sm font-medium text-verde-900 transition-colors duration-300 hover:bg-dorado-dark disabled:opacity-60";

export const NOMBRES_DIA: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};

/**
 * El horario semanal: qué franjas se usan y quién las da.
 *
 * Cada hora tiene dos franjas, una por sala. El estudio enciende la que se usa
 * y le pone instructora; la modalidad la da la sala. Cada cambio se guarda al
 * momento (no hay «Guardar»): es una plantilla, no una clase con gente dentro.
 *
 * ⚠️ Una instructora no puede dar a la misma hora en las dos salas: en el
 * desplegable sale deshabilitada «· en la otra sala». Si no, la agenda se
 * saltaría en silencio la segunda clase (la base no deja solaparla).
 */
export default function PanelHorario({
  franjas,
  instructoras,
  salas,
  puedeEditar,
  semanas,
}: {
  franjas: FranjaHorario[];
  instructoras: MiembroEquipo[];
  salas: Sala[];
  puedeEditar: boolean;
  /** Cuántas semanas por delante mantiene la agenda (`ajustes`). */
  semanas: number;
}) {
  const { mostrarAviso } = useToast();
  const dias = [...new Set(franjas.map((f) => f.dia))].sort((a, b) => a - b);
  const [dia, setDia] = useState(dias[0] ?? 1);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [, iniciar] = useTransition();
  const [copiando, setCopiando] = useState(false);

  const nombreDe = (id: string | null) => instructoras.find((i) => i.id === id)?.nombre;
  const nombreSala = (id: string) => salas.find((s) => s.id === id)?.nombre ?? `Sala de ${id}`;

  const delDia = franjas.filter((f) => f.dia === dia);
  const horas = [...new Set(delDia.map((f) => f.horaInicio))];

  const resumen = (d: number) => {
    const on = franjas.filter((f) => f.dia === d && f.activa);
    return { clases: on.length, sinInstructora: on.filter((f) => !f.instructoraId).length };
  };
  const total = franjas.filter((f) => f.activa);
  const totalSin = total.filter((f) => !f.instructoraId).length;

  function guardar(f: FranjaHorario, activa: boolean, instructoraId: string | null) {
    setGuardando(f.id);
    iniciar(async () => {
      const r = await guardarFranja(f.id, activa, instructoraId);
      setGuardando(null);
      if (!r.ok) return mostrarAviso(r.error, "error");
      /* Cada cambio dice qué pasó en la AGENDA: sin esto no se entendía para
         qué servía el horario (feedback del usuario). */
      const que = `${NOMBRES_DIA[f.dia]} ${f.horaInicio} · ${f.sala}`;
      if (activa && !instructoraId) {
        mostrarAviso(`${que}: elige la instructora para que salga en la agenda.`, "info");
      } else if (activa) {
        mostrarAviso(
          `${que} ya está en la agenda: ${numero(r.enAgenda)} ${r.enAgenda === 1 ? "clase" : "clases"}${r.hasta ? `, hasta el ${fecha(r.hasta)}` : ""}.`,
          "success",
        );
      } else if (r.enAgenda > 0) {
        /* Apagar no borra las clases que alguien ya reservó: esas personas
           cuentan con su clase y alguien tiene que decidir. */
        mostrarAviso(
          `${que} quitada del horario. ${numero(r.enAgenda)} ${r.enAgenda === 1 ? "clase ya tenía" : "clases ya tenían"} reservas y se ${r.enAgenda === 1 ? "queda" : "quedan"} en la agenda: si no se van a dar, cancélalas allí y avisa a quienes reservaron.`,
          "warning",
        );
      } else {
        mostrarAviso(`${que} quitada del horario y de la agenda.`, "success");
      }
    });
  }

  return (
    <>
      <PestanasClases actual="/admin/clases/horario" />

      {/* Qué es esto y qué pasa al tocarlo. Sin esta explicación no se
          entendía la diferencia entre el horario y la agenda (feedback del
          usuario: «sigo sin entender qué es el horario semanal»). */}
      <ol className="mt-4 grid gap-3 rounded-2xl border border-beige bg-white p-4 text-sm text-verde-700 sm:grid-cols-3 sm:p-5">
        <li>
          <span className="font-bold text-verde">1. Marca las clases fijas.</span> Las que se dan
          todas las semanas: «+ Añadir clase» en el día, la hora y la sala.
        </li>
        <li>
          <span className="font-bold text-verde">2. Elige quién la da.</span> Sin instructora, la
          clase no sale en la agenda.
        </li>
        <li>
          <span className="font-bold text-verde">3. Listo: sale sola en la Agenda.</span> Siempre{" "}
          {numero(semanas)} semanas por delante, y ahí se reserva. Cambiar algo aquí cambia las
          próximas clases.
        </li>
      </ol>

      <p className="mt-4 text-sm text-verde-700">
        {numero(total.length)} {total.length === 1 ? "clase" : "clases"} por semana
        {totalSin > 0 && (
          <span className="text-[var(--color-estado-aviso)]">
            {" "}
            · ▲ {numero(totalSin)} sin instructora (no salen en la agenda)
          </span>
        )}
      </p>

      <Card densidad="plana" resalte={false} className="mt-4">
        {/* Días: pestañas con cuántas clases tiene cada uno. Mismo par de
            seleccionado que el resto del panel (dorado + verde-900). */}
        <div role="tablist" aria-label="Día de la semana" className="flex gap-2 overflow-x-auto border-b border-beige p-3 sm:p-4">
          {dias.map((d) => {
            const r = resumen(d);
            const activo = d === dia;
            return (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={activo}
                onClick={() => setDia(d)}
                className={`flex min-h-[44px] shrink-0 flex-col items-center justify-center rounded-xl border px-4 py-1.5 text-sm transition-colors duration-300 ${
                  activo
                    ? "border-dorado bg-dorado text-verde-900"
                    : "border-beige text-verde-700 hover:border-dorado hover:text-verde"
                }`}
              >
                <span className="font-bold">{NOMBRES_DIA[d].slice(0, 3)}</span>
                <span className={`font-cifra text-xs ${activo ? "text-verde-900" : "text-verde-300"}`}>
                  {r.clases === 0 ? "—" : r.clases}
                  {r.sinInstructora > 0 && " ▲"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-5">
          <h2 className="font-display text-2xl text-verde">{NOMBRES_DIA[dia]}</h2>
          {puedeEditar && (
            <button type="button" onClick={() => setCopiando(true)} className={BOTON}>
              <span className="control-sheen" aria-hidden="true" />
              Copiar este día a…
            </button>
          )}
        </div>

        <ul className="mt-2">
          {horas.map((hora) => {
            const deLaHora = delDia.filter((f) => f.horaInicio === hora);
            return (
              <li
                key={hora}
                className="grid gap-3 border-t border-beige px-4 py-4 sm:px-5 md:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)] md:items-start md:gap-4"
              >
                <p className="font-cifra text-lg text-verde md:pt-2">
                  {hora}
                  <span className="text-verde-300"> → {finDe(hora, deLaHora[0].duracionMin)}</span>
                </p>
                {deLaHora.map((f) => {
                  const otra = deLaHora.find((x) => x.id !== f.id);
                  const ocupadaEnOtra = otra?.activa ? otra.instructoraId : null;
                  const enCurso = guardando === f.id;
                  return (
                    <div
                      key={f.id}
                      className={`rounded-xl border p-3 transition-colors duration-300 ${
                        f.activa ? "border-dorado/60 bg-arena/40" : "border-dashed border-beige"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-bold ${f.activa ? "text-verde" : "text-verde-300"}`}>
                          {/* La sala ya dice la modalidad: en la de Reformer se da Reformer. */}
                          {nombreSala(f.sala)}
                        </p>
                        {puedeEditar ? (
                          <button
                            type="button"
                            disabled={enCurso}
                            aria-pressed={f.activa}
                            aria-label={
                              f.activa
                                ? `Quitar ${f.sala} del ${NOMBRES_DIA[dia].toLowerCase()} a las ${hora}`
                                : `Añadir clase de ${f.sala} el ${NOMBRES_DIA[dia].toLowerCase()} a las ${hora}`
                            }
                            onClick={() => guardar(f, !f.activa, f.instructoraId)}
                            className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm transition-colors duration-300 disabled:opacity-60 ${
                              f.activa
                                ? "border-beige bg-white text-[var(--color-estado-grave)] hover:border-[var(--color-estado-grave)]"
                                : "border-dorado/70 bg-white text-verde hover:border-dorado hover:bg-arena"
                            }`}
                          >
                            {enCurso ? "Guardando…" : f.activa ? "Quitar" : "+ Añadir clase"}
                          </button>
                        ) : (
                          <span className="text-sm text-verde-300">{f.activa ? "✓ Se da" : "Sin clase"}</span>
                        )}
                      </div>

                      {f.activa &&
                        (puedeEditar ? (
                          <div className="mt-2">
                            <label htmlFor={`instructora-${f.id}`} className="sr-only">
                              Instructora de {f.sala} el {NOMBRES_DIA[dia].toLowerCase()} a las {hora}
                            </label>
                            <select
                              id={`instructora-${f.id}`}
                              value={f.instructoraId ?? ""}
                              disabled={enCurso}
                              onChange={(e) => guardar(f, true, e.target.value || null)}
                              className="min-h-[44px] w-full rounded-full border border-beige bg-white px-4 text-sm text-verde transition-colors duration-300 hover:border-dorado focus-visible:outline-2 focus-visible:outline-dorado disabled:opacity-60"
                            >
                              <option value="">Elige instructora…</option>
                              {instructoras.map((i) => (
                                <option key={i.id} value={i.id} disabled={i.id === ocupadaEnOtra}>
                                  {i.nombre}
                                  {i.id === ocupadaEnOtra ? " · en la otra sala" : ""}
                                </option>
                              ))}
                            </select>
                            <EstadoEnAgenda franja={f} />
                          </div>
                        ) : (
                          <>
                            <p className="mt-1 text-sm text-verde-700">
                              {nombreDe(f.instructoraId) ?? "Sin instructora"}
                            </p>
                            <EstadoEnAgenda franja={f} />
                          </>
                        ))}
                    </div>
                  );
                })}
              </li>
            );
          })}
        </ul>
      </Card>

      {copiando && (
        <CopiarDia
          desde={dia}
          dias={dias}
          onCerrar={() => setCopiando(false)}
          onCopiado={(n, destino) =>
            mostrarAviso(`${NOMBRES_DIA[dia]} copiado a ${destino}: ${numero(n)} franjas actualizadas.`, "success")
          }
        />
      )}

    </>
  );
}

/** «Copiar el lunes a…»: casillas con los demás días; L–V marcados de entrada. */
function CopiarDia({
  desde,
  dias,
  onCerrar,
  onCopiado,
}: {
  desde: number;
  dias: number[];
  onCerrar: () => void;
  onCopiado: (cambiadas: number, destino: string) => void;
}) {
  const otros = dias.filter((d) => d !== desde);
  const [marcados, setMarcados] = useState<number[]>(otros.filter((d) => d <= 5));
  const [error, setError] = useState("");
  const [enCurso, iniciar] = useTransition();

  function copiar() {
    setError("");
    iniciar(async () => {
      const r = await copiarDiaHorario(desde, marcados);
      if (!r.ok) return setError(r.error);
      onCopiado(r.cambiadas, marcados.map((d) => NOMBRES_DIA[d].toLowerCase()).join(", "));
      onCerrar();
    });
  }

  return (
    <Modal abierto titulo={`Copiar el ${NOMBRES_DIA[desde].toLowerCase()} a…`} onCerrar={onCerrar} cerrable={!enCurso} tamano="md">
      <p className="text-sm text-verde-700">
        Lo que se da y quién lo da pasa a los días marcados, hora por hora. Las
        horas que ese día no tiene se quedan como están.
      </p>
      <fieldset className="mt-4">
        <legend className="sr-only">Días a los que copiar</legend>
        <div className="grid gap-1 sm:grid-cols-2">
          {otros.map((d) => (
            <label key={d} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl px-3 hover:bg-arena">
              <input
                type="checkbox"
                className="size-4 accent-dorado"
                checked={marcados.includes(d)}
                onChange={(e) =>
                  setMarcados((m) => (e.target.checked ? [...m, d] : m.filter((x) => x !== d)))
                }
              />
              <span className="text-sm text-verde">{NOMBRES_DIA[d]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {marcados.includes(6) && desde !== 6 && (
        <p className="mt-2 text-xs text-[var(--color-estado-aviso)]">
          ▲ El sábado tiene otras horas: solo se copian las que coinciden.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-[var(--color-estado-grave)]">
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCerrar} className={BOTON}>
          <span className="control-sheen" aria-hidden="true" />
          Volver
        </button>
        <button type="button" disabled={marcados.length === 0 || enCurso} onClick={copiar} className={BOTON_PRIMARIO}>
          {enCurso ? "Copiando…" : "Copiar"}
        </button>
      </div>
    </Modal>
  );
}

/** Qué hay de esta franja en la agenda: la respuesta a «¿y esto qué hace?». */
function EstadoEnAgenda({ franja }: { franja: FranjaHorario }) {
  if (!franja.instructoraId)
    return (
      <p className="mt-1.5 text-xs text-[var(--color-estado-aviso)]">
        ▲ Falta la instructora: todavía no sale en la agenda.
      </p>
    );
  if (franja.enAgenda === 0)
    return <p className="mt-1.5 text-xs text-verde-300">Saldrá en la agenda en cuanto se rellene.</p>;
  return (
    <p className="mt-1.5 text-xs text-[var(--color-estado-ok)]">
      ✓ En la agenda: {numero(franja.enAgenda)} {franja.enAgenda === 1 ? "clase" : "clases"}
      {franja.hastaAgenda ? `, hasta el ${fecha(franja.hastaAgenda)}` : ""}
    </p>
  );
}
