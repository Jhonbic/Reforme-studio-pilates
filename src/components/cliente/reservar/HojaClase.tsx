"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import Modal from "@/components/admin/Modal";
import { diaRelativo } from "@/lib/admin/horario";
import {
  cancelarReserva,
  reprogramarReserva,
  reservarClase,
  salirListaEspera,
  unirmeListaEspera,
  type Resultado,
} from "@/lib/cliente/acciones";
import type { ClaseParaCliente } from "@/lib/cliente/datos";
import { cancelable, type EstadoParaMi } from "@/lib/cliente/reservar";
import { WHATSAPP_ESTUDIO } from "@/lib/contacto";

const BOTON =
  "inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-sm font-medium transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-60";
const PRINCIPAL = `${BOTON} bg-dorado text-verde-900 hover:bg-dorado-dark`;
const SECUNDARIO = `${BOTON} border border-verde/30 text-verde-700 hover:border-dorado hover:text-verde`;
const PELIGRO = `${BOTON} border border-verde/30 text-verde-700 hover:border-error/60 hover:text-error`;

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-beige py-2.5 last:border-b-0">
      <dt className="text-xs uppercase tracking-wider text-verde-300">{etiqueta}</dt>
      <dd className="text-right text-verde">{children}</dd>
    </div>
  );
}

/** Un recuadro con lo que pasará o por qué no se puede. */
function Nota({ tono = "dorado", children }: { tono?: "dorado" | "neutro"; children: ReactNode }) {
  return (
    <p
      className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
        tono === "dorado" ? "bg-dorado/10 text-verde" : "bg-arena text-verde-700"
      }`}
    >
      {children}
    </p>
  );
}

/**
 * La hoja de una clase (nov 2026): se abre al tocar un bloque en «Reservar» o
 * «Reservar» en «Con cupo para ti» del Inicio. Desde abajo en el móvil y como
 * diálogo en escritorio (`Modal`, que ya lo hace así).
 *
 * Enseña el detalle y lo que va a pasar ANTES de pulsar («te quedarán 10 de
 * Reformer»), y la acción que toca según el estado: reservar, cancelar o
 * cambiar la suya, entrar o salir de la lista de espera, o por qué no se puede.
 *
 * Al salir bien se cierra sin aviso (decisión del usuario: el cambio ya se ve
 * en la rejilla). Un error se queda dentro de la hoja. Mientras la acción
 * está en vuelo no se puede cerrar: cerrar a medias dejaría la duda de si se
 * hizo.
 */
export default function HojaClase({
  clase: c,
  estado,
  hoy,
  ahoraMin,
  horasParaCancelar,
  destinos,
  onCerrar,
}: {
  clase: ClaseParaCliente;
  estado: EstadoParaMi;
  hoy: string;
  ahoraMin: number;
  horasParaCancelar: number;
  /** Clases a las que puede cambiar esta reserva (solo si es suya). */
  destinos: ClaseParaCliente[];
  onCerrar: () => void;
}) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cambiando, setCambiando] = useState(false);
  const [destino, setDestino] = useState("");

  function correr(accion: () => Promise<Resultado>) {
    setError(null);
    iniciar(async () => {
      const r = await accion();
      if (r.ok) onCerrar();
      else setError(r.error);
    });
  }

  const puedeCancelar = cancelable(c, hoy, ahoraMin, horasParaCancelar);
  const cuando = diaRelativo(c.fecha, hoy);

  let pie: ReactNode;
  let nota: ReactNode = null;

  switch (estado) {
    case "disponible":
      /* Solo la regla de cancelar, con icono de aviso (decisión del usuario). */
      nota = (
        <p className="mt-4 flex items-start gap-3 rounded-2xl bg-dorado/10 px-4 py-3 text-sm text-verde">
          <svg
            className="mt-0.5 size-5 shrink-0 text-dorado-tinta"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          </svg>
          <span>
            Puedes cancelarla hasta {horasParaCancelar} {horasParaCancelar === 1 ? "hora" : "horas"} antes sin que
            se descuente de tu plan.
          </span>
        </p>
      );
      pie = (
        <>
          <button type="button" className={SECUNDARIO} onClick={onCerrar} disabled={pendiente}>
            Volver
          </button>
          <button type="button" className={PRINCIPAL} disabled={pendiente} onClick={() => correr(() => reservarClase(c.id))}>
            {pendiente ? "Reservando…" : "Reservar"}
          </button>
        </>
      );
      break;

    case "reservada":
      nota = puedeCancelar ? (
        <Nota>
          Es tu clase. Si no puedes venir, cancélala hasta {horasParaCancelar} h antes y recuperas la clase de tu
          plan.
        </Nota>
      ) : (
        <Nota tono="neutro">
          Es tu clase. Faltan menos de {horasParaCancelar} h: para cancelarla,{" "}
          <a href={WHATSAPP_ESTUDIO} target="_blank" rel="noopener noreferrer" className="text-dorado-tinta underline">
            escríbenos
          </a>
          .
        </Nota>
      );
      pie = puedeCancelar ? (
        <>
          {/* Cambiar = cancelar + reservar otra de una vez: si la nueva no
              entra, la vieja se queda. Las privadas no: van por recepción. */}
          {c.disponibles !== null && !cambiando && (
            <button type="button" className={SECUNDARIO} disabled={pendiente} onClick={() => setCambiando(true)}>
              Cambiar por otra
            </button>
          )}
          <button type="button" className={PELIGRO} disabled={pendiente} onClick={() => correr(() => cancelarReserva(c.id))}>
            {pendiente ? "Un momento…" : "Cancelar reserva"}
          </button>
        </>
      ) : (
        <button type="button" className={SECUNDARIO} onClick={onCerrar}>
          Cerrar
        </button>
      );
      break;

    case "espera":
      nota = (
        <Nota>
          Estás en la lista de espera, puesto <strong className="font-cifra">{c.puestoEspera}</strong>. Si alguien
          cancela con al menos {horasParaCancelar} h de antelación, entras solo y se descuenta de tu plan.
        </Nota>
      );
      pie = (
        <>
          <button type="button" className={SECUNDARIO} onClick={onCerrar} disabled={pendiente}>
            Volver
          </button>
          <button type="button" className={PELIGRO} disabled={pendiente} onClick={() => correr(() => salirListaEspera(c.id))}>
            {pendiente ? "Un momento…" : "Salir de la lista"}
          </button>
        </>
      );
      break;

    case "llena-espera":
      nota = (
        <Nota>
          La clase está llena. Apúntate a la lista de espera: si alguien cancela con al menos {horasParaCancelar} h
          de antelación, entras solo y se descuenta de tu plan.
        </Nota>
      );
      pie = (
        <>
          <button type="button" className={SECUNDARIO} onClick={onCerrar} disabled={pendiente}>
            Volver
          </button>
          <button type="button" className={PRINCIPAL} disabled={pendiente} onClick={() => correr(() => unirmeListaEspera(c.id))}>
            {pendiente ? "Un momento…" : "Unirme a la lista de espera"}
          </button>
        </>
      );
      break;

    default: {
      const porque =
        estado === "privada"
          ? "Las clases privadas se reservan en recepción."
          : estado === "sin-plan"
            ? "Tu plan no cubre este día."
            : estado === "sin-clases"
              ? `Ya usaste todas tus clases de ${c.tipo} de este plan.`
              : "La clase está llena.";
      nota = <Nota tono="neutro">{porque}</Nota>;
      pie = (
        <>
          <button type="button" className={SECUNDARIO} onClick={onCerrar}>
            Volver
          </button>
          {estado === "privada" ? (
            <a href={WHATSAPP_ESTUDIO} target="_blank" rel="noopener noreferrer" className={PRINCIPAL}>
              Escribir por WhatsApp
            </a>
          ) : estado !== "llena" ? (
            <Link href="/mi-cuenta/planes" className={PRINCIPAL}>
              Ver los planes
            </Link>
          ) : null}
        </>
      );
    }
  }

  return (
    <Modal abierto onCerrar={onCerrar} titulo={`${c.tipo} · ${cuando}`} tamano="sm" cerrable={!pendiente} pie={pie}>
      <dl>
        <Dato etiqueta="Hora">
          <span className="font-cifra">
            {c.horaInicio} → {c.horaFin}
          </span>
        </Dato>
        <Dato etiqueta="Instructora">{c.instructora}</Dato>
        <Dato etiqueta="Cupos">
          {c.libres <= 0 ? "Llena" : `${c.libres} ${c.libres === 1 ? "libre" : "libres"}`}
        </Dato>
      </dl>

      {nota}

      {cambiando && (
        <div className="mt-4 border-t border-beige pt-4">
          {destinos.length === 0 ? (
            <p className="text-sm text-verde-700">
              No hay otra clase con cupo a la que puedas cambiarla en los próximos días.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <label className="text-sm text-verde">
                <span className="mb-1.5 block font-medium">Cambiar por</span>
                <select
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  className="min-h-[44px] w-full rounded-full border border-beige bg-white px-4 text-sm text-verde"
                >
                  <option value="">Elige la nueva clase…</option>
                  {destinos.map((o) => (
                    <option key={o.id} value={o.id}>
                      {diaRelativo(o.fecha, hoy)} · {o.horaInicio} · {o.tipo} · {o.instructora}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className={PRINCIPAL}
                disabled={!destino || pendiente}
                onClick={() => correr(() => reprogramarReserva(c.id, destino))}
              >
                {pendiente ? "Cambiando…" : "Confirmar cambio"}
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}
    </Modal>
  );
}
