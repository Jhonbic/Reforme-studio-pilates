"use client";

import { useState, useTransition } from "react";
import Modal from "@/components/admin/Modal";
import { useToast } from "@/context/ToastContext";
import {
  apuntarListaEspera,
  marcarAsistencia,
  moverReserva,
  quitarDeListaEspera,
  quitarReserva,
  reservar,
} from "@/lib/admin/acciones";
import { cuandoEs, diaRelativo } from "@/lib/admin/horario";
import { puedeMarcarAsistencia, resumenAsistencia } from "@/lib/admin/asistencia";
import { numero } from "@/lib/admin/format";
import type { Asistencia, ClaseEnAgenda, EstadoMembresia } from "@/lib/admin/types";
import BuscadorApuntar from "./BuscadorApuntar";

const QUITAR =
  "inline-flex min-h-[44px] items-center rounded-full px-4 text-sm text-[var(--color-estado-grave)] transition-colors duration-300 hover:bg-[color-mix(in_srgb,var(--color-estado-grave)_8%,transparent)] disabled:opacity-60";

export type ClienteParaReservar = {
  id: string;
  nombre: string;
  /** Solo dígitos: para buscar por cédula. */
  identificacion: string;
  estado: EstadoMembresia;
};

/** El botón «Asistió» / «No vino». Encendido lleva símbolo + color: nunca
 *  solo color, como `EstadoBadge`. */
const MARCA =
  "inline-flex min-h-[44px] items-center justify-center gap-1 rounded-full border px-3 text-sm transition-colors duration-300 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado";
const MARCA_APAGADA = "border-beige text-verde-700 hover:border-dorado hover:text-verde";
const MARCA_ENCENDIDA: Record<Asistencia, string> = {
  Asistió:
    "border-[var(--color-estado-ok)] bg-[color-mix(in_srgb,var(--color-estado-ok)_12%,transparent)] text-[var(--color-estado-ok)] font-medium",
  "No vino":
    "border-[var(--color-estado-grave)] bg-[color-mix(in_srgb,var(--color-estado-grave)_10%,transparent)] text-[var(--color-estado-grave)] font-medium",
};
const SIMBOLO: Record<Asistencia, string> = { Asistió: "✓", "No vino": "✕" };

/**
 * Quién reservó una clase y, para el mostrador, apuntar o quitar gente.
 *
 * Hoy lo hace recepción (alguien llama o escribe por WhatsApp); con el paso
 * 10 los clientes reservarán solos desde su área.
 *
 * ⚠️ El aforo lo vigila la base (trigger `reservas_respetan_aforo`): aquí solo
 * se esconde el selector cuando no quedan cupos, para no ofrecer algo que va a
 * fallar. Si dos personas apuntan a la vez al último cupo, la segunda recibe
 * «La clase está llena».
 *
 * Lee la clase por id desde la agenda que le pasa `PanelClases`: tras apuntar
 * o quitar, la acción revalida y la lista se actualiza sola.
 */
export default function ReservasClase({
  clase,
  agenda,
  hoy,
  clientes,
  puedeEditar,
  miEquipoId,
  onCerrar,
}: {
  clase: ClaseEnAgenda | null;
  /** Toda la agenda: para «Mover» a otra clase. */
  agenda: ClaseEnAgenda[];
  hoy: string;
  clientes: ClienteParaReservar[];
  puedeEditar: boolean;
  /** Para que la instructora de la clase pueda marcar la asistencia. */
  miEquipoId: string | null;
  onCerrar: () => void;
}) {
  const { mostrarAviso } = useToast();
  const [error, setError] = useState("");
  const [enCurso, iniciar] = useTransition();
  /** La reserva que se está moviendo y la clase elegida. */
  const [moviendo, setMoviendo] = useState<string | null>(null);
  const [destino, setDestino] = useState("");

  if (!clase) return null;

  // Solo se cambia lo que aún no ha pasado ni se ha anulado.
  const editable = puedeEditar && (clase.estado === "Programada" || clase.estado === "Llena");
  const apuntados = new Set(clase.reservados.map((r) => r.clienteId));
  const enEspera = new Set(clase.enEspera.map((e) => e.clienteId));
  const disponibles = clientes.filter((c) => !apuntados.has(c.id) && !enEspera.has(c.id));
  /* A dónde se puede mover a alguien: clases de la misma modalidad que no han
     empezado, no canceladas y con cupo. La base vuelve a comprobarlo todo. */
  const destinos = agenda.filter(
    (o) => o.id !== clase.id && o.tipo === clase.tipo && !o.empezada && !o.cancelada && o.libres > 0,
  );
  const marcable = puedeMarcarAsistencia(clase, puedeEditar, miEquipoId);
  const resumen = resumenAsistencia(clase.reservados);

  function cerrar() {
    setError("");
    onCerrar();
  }

  function apuntar(cliente: ClienteParaReservar) {
    if (!clase) return;
    setError("");
    iniciar(async () => {
      const r = await reservar(clase.id, cliente.id);
      if (!r.ok) return setError(r.error);
      mostrarAviso(`${cliente.nombre} apuntada a ${clase.tipo} de las ${clase.horaInicio}.`, "success");
    });
  }

  function aLaEspera(cliente: ClienteParaReservar) {
    if (!clase) return;
    setError("");
    iniciar(async () => {
      const r = await apuntarListaEspera(clase.id, cliente.id);
      if (!r.ok) return setError(r.error);
      mostrarAviso(`${cliente.nombre} está en la lista de espera. Si se libera un cupo, entra sola.`, "success");
    });
  }

  function mover(reservaId: string, nombre: string) {
    const o = agenda.find((x) => x.id === destino);
    setError("");
    iniciar(async () => {
      const r = await moverReserva(reservaId, destino);
      if (!r.ok) return setError(r.error);
      setMoviendo(null);
      setDestino("");
      mostrarAviso(
        o ? `${nombre} pasó a ${o.tipo} ${cuandoEs(o.fecha, hoy)} a las ${o.horaInicio}.` : `${nombre} cambió de clase.`,
        "success",
      );
    });
  }

  function sacarDeLaEspera(id: string, nombre: string) {
    setError("");
    iniciar(async () => {
      const r = await quitarDeListaEspera(id);
      if (!r.ok) return setError(r.error);
      mostrarAviso(`${nombre} ya no está en la lista de espera.`, "success");
    });
  }

  function quitar(reservaId: string, nombre: string) {
    setError("");
    iniciar(async () => {
      const r = await quitarReserva(reservaId);
      if (!r.ok) return setError(r.error);
      mostrarAviso(`${nombre} ya no está en la clase. Cupo liberado.`, "success");
    });
  }

  /* Pulsar la marca que ya está puesta la QUITA: es la forma de deshacer un
     toque equivocado sin un tercer botón. */
  function marcar(ids: string[], valor: Asistencia | null, aviso: string) {
    setError("");
    iniciar(async () => {
      const r = await marcarAsistencia(ids, valor);
      if (!r.ok) return setError(r.error);
      mostrarAviso(aviso, "success");
    });
  }

  return (
    <Modal
      abierto
      onCerrar={cerrar}
      cerrable={!enCurso}
      titulo={`${clase.tipo} · ${clase.horaInicio}–${clase.horaFin}`}
      tamano="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-verde-700">
          {numero(clase.reservas)} de {numero(clase.cupos)} cupos reservados ·
          con {clase.instructora}
        </p>

        {/* El recuento va antes de la lista: es lo que se quiere saber al
            abrir una clase que ya pasó. */}
        {clase.empezada && clase.estado !== "Cancelada" && clase.reservados.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-arena/60 px-4 py-3">
            <p className="text-sm text-verde-700">
              <span className="text-[var(--color-estado-ok)]">✓ {numero(resumen.asistio)}</span>{" "}
              {resumen.asistio === 1 ? "vino" : "vinieron"} ·{" "}
              <span className="text-[var(--color-estado-grave)]">✕ {numero(resumen.noVino)}</span> no{" "}
              {resumen.noVino === 1 ? "vino" : "vinieron"}
              {resumen.sinMarcar > 0 && (
                <>
                  {" "}
                  · <span className="text-[var(--color-estado-aviso)]">{numero(resumen.sinMarcar)} sin marcar</span>
                </>
              )}
            </p>
            {marcable && resumen.sinMarcar > 1 && (
              <button
                type="button"
                disabled={enCurso}
                onClick={() =>
                  marcar(
                    clase.reservados.filter((r) => !r.asistencia).map((r) => r.id),
                    "Asistió",
                    `Marcadas ${resumen.sinMarcar} asistencias.`,
                  )
                }
                className="inline-flex min-h-[44px] items-center rounded-full border border-beige bg-white px-4 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde disabled:opacity-60"
              >
                Vinieron los {numero(resumen.sinMarcar)} que faltan
              </button>
            )}
          </div>
        )}

        {clase.reservados.length === 0 ? (
          <p className="rounded-xl border border-beige bg-arena/50 px-4 py-6 text-center text-sm text-verde-300">
            Nadie la ha reservado todavía.
          </p>
        ) : (
          <ul className="divide-y divide-beige rounded-xl border border-beige">
            {clase.reservados.map((r) => (
              <li
                key={r.id}
                className="flex min-h-[52px] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2"
              >
                {/* Con marcas, en móvil el nombre va en su línea y los botones
                    debajo a todo el ancho: al lado, el nombre se cortaba en
                    «Daniela Card…» y no se sabía a quién se marcaba. */}
                <span
                  className={`min-w-0 truncate text-verde ${marcable ? "w-full sm:w-auto sm:flex-1" : "flex-1"}`}
                >
                  {r.nombre}
                </span>
                {marcable && (
                  <div className="flex w-full gap-2 sm:w-auto" role="group" aria-label={`Asistencia de ${r.nombre}`}>
                    {(["Asistió", "No vino"] as const).map((v) => {
                      const puesta = r.asistencia === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          disabled={enCurso}
                          aria-pressed={puesta}
                          onClick={() =>
                            marcar(
                              [r.id],
                              puesta ? null : v,
                              puesta ? `Asistencia de ${r.nombre} sin marcar.` : `${r.nombre}: ${v.toLowerCase()}.`,
                            )
                          }
                          className={`${MARCA} flex-1 sm:flex-none ${puesta ? MARCA_ENCENDIDA[v] : MARCA_APAGADA}`}
                        >
                          {puesta && <span aria-hidden="true">{SIMBOLO[v]}</span>}
                          {v}
                        </button>
                      );
                    })}
                  </div>
                )}
                {/* Quien no puede marcar (otra instructora) ve lo marcado. */}
                {!marcable && r.asistencia && (
                  <span
                    className={`text-sm ${
                      r.asistencia === "Asistió"
                        ? "text-[var(--color-estado-ok)]"
                        : "text-[var(--color-estado-grave)]"
                    }`}
                  >
                    {SIMBOLO[r.asistencia]} {r.asistencia}
                  </span>
                )}
                {/* Empezada la clase ya no se quita ni se mueve a nadie: se marca. */}
                {editable && !clase.empezada && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={enCurso}
                      aria-expanded={moviendo === r.id}
                      onClick={() => {
                        setMoviendo(moviendo === r.id ? null : r.id);
                        setDestino("");
                      }}
                      className="inline-flex min-h-[44px] items-center rounded-full px-4 text-sm text-verde-700 transition-colors duration-300 hover:bg-arena disabled:opacity-60"
                      aria-label={`Mover a ${r.nombre} a otra clase`}
                    >
                      Mover
                    </button>
                    <button
                      type="button"
                      disabled={enCurso}
                      onClick={() => quitar(r.id, r.nombre)}
                      className={QUITAR}
                      aria-label={`Quitar a ${r.nombre} de la clase`}
                    >
                      Quitar
                    </button>
                  </div>
                )}
                {moviendo === r.id && (
                  <div className="w-full pb-2">
                    {destinos.length === 0 ? (
                      <p className="text-sm text-verde-300">No hay otra clase de {clase.tipo} con cupo en la agenda.</p>
                    ) : (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <label className="min-w-0 flex-1 text-sm text-verde">
                          <span className="mb-1.5 block font-medium">Mover a</span>
                          <select
                            value={destino}
                            onChange={(e) => setDestino(e.target.value)}
                            className="min-h-[44px] w-full rounded-full border border-beige bg-white px-4 text-sm text-verde"
                          >
                            <option value="">Elige la clase…</option>
                            {destinos.map((o) => (
                              <option key={o.id} value={o.id}>
                                {diaRelativo(o.fecha, hoy)} · {o.horaInicio} · {o.instructora} · {o.libres}{" "}
                                {o.libres === 1 ? "libre" : "libres"}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          disabled={!destino || enCurso}
                          onClick={() => mover(r.id, r.nombre)}
                          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-dorado px-5 text-sm font-medium text-verde-900 transition-colors duration-300 hover:bg-dorado-dark disabled:opacity-60"
                        >
                          Mover
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Lista de espera, por orden de llegada: al liberarse un cupo entra
            sola la primera que tenga clases en su plan. */}
        {clase.enEspera.length > 0 && (
          <div>
            <p className="text-sm font-medium text-verde">
              Lista de espera · {numero(clase.enEspera.length)}
            </p>
            <ol className="mt-2 divide-y divide-beige rounded-xl border border-dashed border-dorado/60">
              {clase.enEspera.map((e, i) => (
                <li key={e.id} className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-2">
                  <span className="min-w-0 truncate text-sm text-verde">
                    <span className="font-cifra text-dorado-dark">{i + 1}.</span> {e.nombre}
                  </span>
                  {editable && (
                    <button
                      type="button"
                      disabled={enCurso}
                      onClick={() => sacarDeLaEspera(e.id, e.nombre)}
                      className={QUITAR}
                      aria-label={`Quitar a ${e.nombre} de la lista de espera`}
                    >
                      Quitar
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        {editable &&
          (clase.libres === 0 ? (
            clase.tipo === "Privada" ? (
              <p className="text-sm text-verde-300">
                Sin cupos libres. Para apuntar a otra persona, quítala o sube el aforo desde «Editar».
              </p>
            ) : (
              <>
                <p className="text-sm text-verde-300">
                  Llena. Puedes apuntar a alguien a la lista de espera: entra sola si se libera un cupo.
                </p>
                <BuscadorApuntar
                  clase={clase}
                  clientes={disponibles}
                  enCurso={enCurso}
                  onApuntar={aLaEspera}
                  textoBoton="A la espera"
                />
              </>
            )
          ) : (
            <BuscadorApuntar clase={clase} clientes={disponibles} enCurso={enCurso} onApuntar={apuntar} />
          ))}

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-[color-mix(in_srgb,var(--color-estado-grave)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-estado-grave)_8%,transparent)] px-4 py-3 text-sm text-[var(--color-estado-grave)]"
          >
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
