"use client";

import { useState, useTransition } from "react";
import Modal from "@/components/admin/Modal";
import CampoSelect from "@/components/admin/campos/CampoSelect";
import { useToast } from "@/context/ToastContext";
import { quitarReserva, reservar } from "@/lib/admin/acciones";
import { numero } from "@/lib/admin/format";
import type { ClaseEnAgenda, EstadoMembresia } from "@/lib/admin/types";

const BOTON_PRIMARIO =
  "inline-flex min-h-[44px] items-center justify-center rounded-full bg-dorado px-5 text-sm font-medium text-verde-900 transition-colors duration-300 hover:bg-dorado-dark disabled:opacity-60";
const QUITAR =
  "inline-flex min-h-[44px] items-center rounded-full px-4 text-sm text-[var(--color-estado-grave)] transition-colors duration-300 hover:bg-[color-mix(in_srgb,var(--color-estado-grave)_8%,transparent)] disabled:opacity-60";

export type ClienteParaReservar = {
  id: string;
  nombre: string;
  estado: EstadoMembresia;
};

/** Estados con los que reservar merece un aviso: no se bloquea (puede pagar
 *  al llegar), pero recepción tiene que verlo antes de apuntar a alguien. */
const SIN_PLAN_VIGENTE: EstadoMembresia[] = ["Vencida", "Sin plan"];

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
  clientes,
  puedeEditar,
  onCerrar,
}: {
  clase: ClaseEnAgenda | null;
  clientes: ClienteParaReservar[];
  puedeEditar: boolean;
  onCerrar: () => void;
}) {
  const { mostrarAviso } = useToast();
  const [elegido, setElegido] = useState("");
  const [error, setError] = useState("");
  const [enCurso, iniciar] = useTransition();

  if (!clase) return null;

  // Solo se cambia lo que aún no ha pasado ni se ha anulado.
  const editable = puedeEditar && (clase.estado === "Programada" || clase.estado === "Llena");
  const apuntados = new Set(clase.reservados.map((r) => r.clienteId));
  const disponibles = clientes.filter((c) => !apuntados.has(c.id));
  const cliente = clientes.find((c) => c.id === elegido);

  function cerrar() {
    setElegido("");
    setError("");
    onCerrar();
  }

  function apuntar() {
    if (!clase || !cliente) return;
    setError("");
    iniciar(async () => {
      const r = await reservar(clase.id, cliente.id);
      if (!r.ok) return setError(r.error);
      setElegido("");
      mostrarAviso(`${cliente.nombre} apuntada a ${clase.tipo} de las ${clase.horaInicio}.`, "success");
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

        {clase.reservados.length === 0 ? (
          <p className="rounded-xl border border-beige bg-arena/50 px-4 py-6 text-center text-sm text-verde-300">
            Nadie la ha reservado todavía.
          </p>
        ) : (
          <ul className="divide-y divide-beige rounded-xl border border-beige">
            {clase.reservados.map((r) => (
              <li key={r.id} className="flex min-h-[52px] items-center justify-between gap-3 px-4">
                <span className="min-w-0 truncate text-verde">{r.nombre}</span>
                {editable && (
                  <button
                    type="button"
                    disabled={enCurso}
                    onClick={() => quitar(r.id, r.nombre)}
                    className={QUITAR}
                    aria-label={`Quitar a ${r.nombre} de la clase`}
                  >
                    Quitar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {editable &&
          (clase.libres === 0 ? (
            <p className="text-sm text-verde-300">
              Sin cupos libres. Para apuntar a alguien más, quita a otra persona
              o sube el aforo desde «Editar».
            </p>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <CampoSelect
                  nombre="reservar-cliente"
                  etiqueta="Apuntar a"
                  value={elegido}
                  onChange={(e) => {
                    setElegido(e.target.value);
                    setError("");
                  }}
                  ancho
                >
                  <option value="">Elige un cliente…</option>
                  {disponibles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                      {SIN_PLAN_VIGENTE.includes(c.estado) ? ` · ${c.estado}` : ""}
                    </option>
                  ))}
                </CampoSelect>
              </div>
              <button
                type="button"
                disabled={!cliente || enCurso}
                onClick={apuntar}
                className={BOTON_PRIMARIO}
              >
                {enCurso ? "Guardando…" : "Apuntar"}
              </button>
            </div>
          ))}

        {/* Aviso, no bloqueo: puede estar renovando ese mismo día. */}
        {editable && cliente && SIN_PLAN_VIGENTE.includes(cliente.estado) && (
          <p className="text-xs text-[var(--color-estado-aviso)]">
            ▲ {cliente.nombre} no tiene un plan vigente ({cliente.estado}). Se
            puede apuntar, pero recuerda cobrarle.
          </p>
        )}

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
