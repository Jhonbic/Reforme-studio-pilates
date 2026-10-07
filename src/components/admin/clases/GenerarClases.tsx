"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import Modal from "@/components/admin/Modal";
import CampoSelect from "@/components/admin/campos/CampoSelect";
import CampoTexto from "@/components/admin/campos/CampoTexto";
import { generarClases } from "@/lib/admin/acciones";
import { fecha, numero } from "@/lib/admin/format";
import { diaSemana, sumarDias } from "@/lib/admin/horario";
import type { FranjaHorario } from "@/lib/admin/types";

const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center justify-center gap-2 overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde";
const BOTON_PRIMARIO =
  "inline-flex min-h-[44px] items-center justify-center rounded-full bg-dorado px-5 text-sm font-medium text-verde-900 transition-colors duration-300 hover:bg-dorado-dark disabled:opacity-60";

const SEMANAS = [1, 2, 4, 8, 12];

type Resultado = { creadas: number; yaEstaban: number; sinInstructora: number };

/**
 * Pasa el horario semanal a la agenda: las franjas encendidas y con
 * instructora se convierten en clases para las semanas elegidas.
 *
 * Antes de pulsar se anuncia cuántas saldrán (la cuenta es la misma que hace
 * la base, sin contar lo que ya esté en la agenda). La base se salta lo
 * repetido, así que lanzarlo dos veces no duplica nada: el resultado lo dice.
 */
export default function GenerarClases({
  franjas,
  hoy,
  ahora,
  onCerrar,
}: {
  franjas: FranjaHorario[];
  hoy: string;
  /** «HH:MM» de Bogotá: hoy no se crea lo que ya empezó (igual que la base). */
  ahora: string;
  onCerrar: () => void;
}) {
  const [desde, setDesde] = useState(hoy);
  const [semanas, setSemanas] = useState(4);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [enCurso, iniciar] = useTransition();

  const valida = /^\d{4}-\d{2}-\d{2}$/.test(desde) && desde >= hoy;
  const hasta = valida ? sumarDias(desde, semanas * 7 - 1) : desde;

  /* Cuántas clases saldrían: por cada día del rango, las franjas de ese día
     de la semana encendidas y con instructora. */
  let posibles = 0;
  let sinInstructora = 0;
  if (valida) {
    for (let d = desde; d <= hasta; d = sumarDias(d, 1)) {
      const iso = diaSemana(d) + 1;
      for (const f of franjas) {
        if (f.dia !== iso || !f.activa) continue;
        if (d === hoy && f.horaInicio <= ahora) continue;
        if (f.instructoraId) posibles++;
        else sinInstructora++;
      }
    }
  }

  function generar() {
    setError("");
    iniciar(async () => {
      const r = await generarClases(desde, hasta);
      if (!r.ok) return setError(r.error);
      setResultado(r);
    });
  }

  return (
    <Modal abierto onCerrar={onCerrar} titulo="Generar clases" tamano="md" cerrable={!enCurso}>
      {resultado ? (
        <div className="space-y-4" role="status">
          <p className="font-display text-2xl text-verde">
            {resultado.creadas === 0
              ? "No había clases nuevas que crear"
              : `${numero(resultado.creadas)} ${resultado.creadas === 1 ? "clase creada" : "clases creadas"}`}
          </p>
          <ul className="space-y-1 text-sm text-verde-700">
            <li>
              Del {fecha(desde)} al {fecha(hasta, true)}.
            </li>
            {resultado.yaEstaban > 0 && (
              <li>
                {numero(resultado.yaEstaban)} ya {resultado.yaEstaban === 1 ? "estaba" : "estaban"} en la agenda,
                o su sala o su instructora ya tenían otra clase a esa hora: no se tocaron.
              </li>
            )}
            {resultado.sinInstructora > 0 && (
              <li className="text-[var(--color-estado-aviso)]">
                ▲ {numero(resultado.sinInstructora)} no se crearon por no tener instructora.
              </li>
            )}
          </ul>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCerrar} className={BOTON}>
              <span className="control-sheen" aria-hidden="true" />
              Cerrar
            </button>
            <Link href="/admin/clases" className={BOTON_PRIMARIO}>
              Ver la agenda
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-verde-700">
            Crea en la agenda las clases del horario semanal. Lo que ya esté en
            la agenda no se repite, así que se puede volver a generar sin miedo.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto
              nombre="generar-desde"
              etiqueta="Desde"
              type="date"
              min={hoy}
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              error={desde && !valida ? "Elige hoy o un día que no haya pasado." : undefined}
            />
            <CampoSelect
              nombre="generar-semanas"
              etiqueta="Cuántas semanas"
              value={String(semanas)}
              onChange={(e) => setSemanas(Number(e.target.value))}
            >
              {SEMANAS.map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "semana" : "semanas"}
                </option>
              ))}
            </CampoSelect>
          </div>

          {valida && (
            <p className="rounded-xl bg-arena px-4 py-3 text-sm text-verde-700">
              Del <strong className="text-verde">{fecha(desde)}</strong> al{" "}
              <strong className="text-verde">{fecha(hasta, true)}</strong>: hasta{" "}
              <strong className="font-cifra text-verde">{numero(posibles)}</strong>{" "}
              {posibles === 1 ? "clase" : "clases"}.
            </p>
          )}
          {valida && sinInstructora > 0 && (
            <p className="text-xs text-[var(--color-estado-aviso)]">
              ▲ {numero(sinInstructora)} {sinInstructora === 1 ? "clase encendida no tiene" : "clases encendidas no tienen"} instructora
              y no se crearán. Asígnalas en el horario antes de generar.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-[var(--color-estado-grave)]">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCerrar} className={BOTON}>
              <span className="control-sheen" aria-hidden="true" />
              Volver
            </button>
            <button
              type="button"
              disabled={!valida || posibles === 0 || enCurso}
              onClick={generar}
              className={BOTON_PRIMARIO}
            >
              {enCurso ? "Generando…" : posibles === 0 ? "Nada que generar" : `Generar ${numero(posibles)}`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
