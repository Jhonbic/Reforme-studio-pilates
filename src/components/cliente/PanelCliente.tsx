"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { fecha as fechaCorta } from "@/lib/admin/format";
import { cuandoEs, diaLargo, diaRelativo, lunesDe } from "@/lib/admin/horario";
import { cancelarReserva, reprogramarReserva, salirListaEspera } from "@/lib/cliente/acciones";
import type { ClasePasada, ClaseParaCliente, MiCuenta } from "@/lib/cliente/datos";
import { conCupoParaMi, cubre as cubreDia } from "@/lib/cliente/inicio";
import {
  cancelable,
  diaInicial,
  esAccionable,
  estadoParaMi,
  semanasDeAgenda,
  type EstadoParaMi,
} from "@/lib/cliente/reservar";
import { WHATSAPP_ESTUDIO } from "@/lib/contacto";
import ConCupo from "./inicio/ConCupo";
import HistorialMes from "./inicio/HistorialMes";
import ProximaClase from "./inicio/ProximaClase";
import TarjetaPlan from "./inicio/TarjetaPlan";
import DiaPorHoras from "./reservar/DiaPorHoras";
import HojaClase from "./reservar/HojaClase";
import SemanaTabla from "./reservar/SemanaTabla";
import TiraSemana from "./reservar/TiraSemana";

/** Recepción, para lo que no se puede hacer desde aquí. Mismo número que el
 *  footer de la web. */
const WHATSAPP = WHATSAPP_ESTUDIO;

/** Cuántas próximas clases se enseñan antes de «Ver todas», contando la
 *  grande de «Tu próxima clase». En el móvil cada una ocupa ~90px: con 15
 *  reservas, lo de debajo quedaba a cuatro pantallas de distancia. */
const PROXIMAS_A_LA_VISTA = 3;

const BOTON =
  "inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-sm font-medium transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-60";

/** ¿Alguna membresía cubre ese día? Anuncia ANTES de pulsar lo que la base
 *  comprobará al reservar. */
function cubre(cuenta: MiCuenta, dia: string): boolean {
  return cubreDia(cuenta.cobertura, dia);
}

/**
 * El área de cliente: plan, próximas clases y reservar.
 *
 * Dos vistas (oct 2026, el área se partió en pestañas): `inicio` (saludo,
 * plan, próximas clases y lista de espera) y `reservar` (la agenda). Un solo
 * componente porque comparten las mismas reglas (qué día cubre el plan, qué
 * se puede cancelar) y el mismo aviso.
 *
 * Mobile-first: quien reserva lo hace casi siempre desde el móvil, camino del
 * estudio. Por eso «Reservar» (nov 2026) es una tira de la semana más el día
 * como columna de horas, con un bloque por clase; en escritorio, la semana
 * entera en una tabla. Cada bloque —y «Reservar» de «Con cupo para ti» en el
 * Inicio— abre la hoja de la clase (`HojaClase`), que confirma antes de
 * reservar.
 */
export default function PanelCliente({
  vista,
  cuenta,
  agenda,
  hoy,
  ahora: ahoraHHMM,
  horasParaCancelar,
  historial = [],
}: {
  vista: "inicio" | "reservar";
  cuenta: MiCuenta;
  agenda: ClaseParaCliente[];
  /** Sus clases ya empezadas (`getMiHistorial`), para el calendario del
   *  Inicio. La vista «reservar» no lo usa. */
  historial?: ClasePasada[];
  hoy: string;
  /** «HH:MM» de Bogotá, calculada en el SERVIDOR como `hoy`: calculada aquí al
   *  pintar, servidor y navegador podrían discrepar justo en el límite de las
   *  2 horas (error de hidratación). Solo decide si se ENSEÑA «Cancelar»; la
   *  regla de verdad está en la base. */
  ahora: string;
  /** El plazo para cancelar, de Configuración (`ajustes`): el mismo que
   *  aplica la base en `cancelar_mi_reserva`. */
  horasParaCancelar: number;
}) {
  const [dia, setDia] = useState(() => diaInicial(hoy, agenda, cuenta.cobertura));
  /** La clase de la hoja abierta, por id: tras reservar o cancelar la agenda
   *  se vuelve a pedir y el objeto viejo quedaría desfasado. */
  const [abiertaId, setAbiertaId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [enCurso, setEnCurso] = useState<string | null>(null);
  const [, iniciar] = useTransition();
  const [todas, setTodas] = useState(false);
  /** La reserva que se está cambiando de clase, y la clase elegida. */
  const [cambiando, setCambiando] = useState<string | null>(null);
  const [destino, setDestino] = useState("");

  const mias = agenda.filter((c) => c.reservada);
  const esperando = agenda.filter((c) => c.puestoEspera !== null);

  /* A qué clases se puede cambiar una reserva: con cupo, que su plan cubra y
     con clases de esa modalidad. Si es la MISMA modalidad, cambiar devuelve
     primero la clase de la reserva vieja, así que vale aunque hoy le quede 0. */
  function destinosPara(c: ClaseParaCliente) {
    return agenda.filter(
      (o) =>
        o.id !== c.id &&
        !o.reservada &&
        o.libres > 0 &&
        o.disponibles !== null &&
        cubre(cuenta, o.fecha) &&
        ((o.disponibles ?? 0) > 0 || o.tipo === c.tipo),
    );
  }
  const abierta = abiertaId ? (agenda.find((c) => c.id === abiertaId) ?? null) : null;
  const estadoDe = (c: ClaseParaCliente): EstadoParaMi => estadoParaMi(c, cuenta.cobertura);
  const lunes = lunesDe(dia);
  const semanas = semanasDeAgenda(hoy, agenda);
  const reservables: Record<string, number> = {};
  for (const c of agenda) if (esAccionable(estadoDe(c))) reservables[c.fecha] = (reservables[c.fecha] ?? 0) + 1;
  const diasConClase = new Set(mias.map((c) => c.fecha));
  const nombre = cuenta.nombre.split(" ")[0];
  // De baja no reserva aunque le quede plan: la base lo impide.
  const conPlan = !["Sin plan", "Vencida", "De baja"].includes(cuenta.estado);

  function ejecutar(
    claseId: string,
    accion: () => Promise<{ ok: boolean; error?: string }>,
    /** `null` = sin aviso de éxito: el cambio ya se ve en la pantalla. */
    exito: string | null,
  ) {
    setMensaje(null);
    setEnCurso(claseId);
    iniciar(async () => {
      const r = await accion();
      setEnCurso(null);
      if (r.ok) {
        setCambiando(null);
        setDestino("");
      }
      if (!r.ok) setMensaje({ tipo: "error", texto: r.error ?? "Algo falló." });
      else if (exito) setMensaje({ tipo: "ok", texto: exito });
    });
  }

  const [hh, mm] = ahoraHHMM.split(":").map(Number);
  const ahora = hh * 60 + mm;

  /** Lo que se puede hacer con una reserva: Cambiar y Cancelar mientras
   *  falte más que el plazo; si no, por qué ya no y a quién acudir. Lo usan
   *  «Tu próxima clase» y la lista «También reservaste». */
  function accionesDe(c: ClaseParaCliente) {
    const puede = cancelable(c, hoy, ahora, horasParaCancelar);
    return (
      <>
        {puede ? (
          <div className="flex shrink-0 gap-2">
            {/* Cambiar = cancelar + reservar otra de una vez: si la
                nueva no entra, la reserva vieja se queda. Las
                privadas no: se acuerdan con recepción. */}
            {c.disponibles !== null && (
              <button
                type="button"
                disabled={enCurso === c.id}
                aria-expanded={cambiando === c.id}
                onClick={() => {
                  setCambiando(cambiando === c.id ? null : c.id);
                  setDestino("");
                }}
                className={`${BOTON} border border-verde/30 text-verde-700 hover:border-dorado hover:text-verde`}
                aria-label={`Cambiar la reserva de ${c.tipo}, ${diaRelativo(c.fecha, hoy).toLowerCase()} a las ${c.horaInicio}, por otra clase`}
              >
                Cambiar
              </button>
            )}
            <button
              type="button"
              disabled={enCurso === c.id}
              onClick={() =>
                ejecutar(
                  c.id,
                  () => cancelarReserva(c.id),
                  `Reserva cancelada: ${c.tipo} de las ${c.horaInicio}. El cupo queda libre para otra persona.`,
                )
              }
              className={`${BOTON} border border-verde/30 text-verde-700 hover:border-error/60 hover:text-error`}
              /* Con el día: dos «Reformer de las 07:00» en días distintos se
                 anunciaban igual y no se sabía cuál se cancelaba. */
              aria-label={`Cancelar la reserva de ${c.tipo}, ${diaRelativo(c.fecha, hoy).toLowerCase()} a las ${c.horaInicio}`}
            >
              {enCurso === c.id ? "Un momento…" : "Cancelar"}
            </button>
          </div>
        ) : (
          /* Pasado el plazo no se esconde sin más: se dice por qué
             y a quién acudir. */
          <p className="max-w-[9rem] shrink-0 text-right text-xs text-verde-300">
            Faltan menos de {horasParaCancelar} h: para cancelar,{" "}
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="text-dorado-tinta underline"
            >
              escríbenos
            </a>
          </p>
        )}
        {cambiando === c.id && (
          <div className="w-full border-t border-beige pt-3">
            {destinosPara(c).length === 0 ? (
              <p className="text-sm text-verde-300">
                No hay otra clase con cupo a la que puedas cambiarla en los próximos días.
              </p>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="min-w-0 flex-1 text-sm text-verde">
                  <span className="mb-1.5 block font-medium">Cambiar por</span>
                  <select
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    className="min-h-[44px] w-full rounded-full border border-beige bg-white px-4 text-sm text-verde"
                  >
                    <option value="">Elige la nueva clase…</option>
                    {destinosPara(c).map((o) => (
                      <option key={o.id} value={o.id}>
                        {diaRelativo(o.fecha, hoy)} · {o.horaInicio} · {o.tipo} ·{" "}
                        {o.instructora}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={!destino || enCurso === c.id}
                  onClick={() => {
                    const o = agenda.find((x) => x.id === destino);
                    ejecutar(
                      c.id,
                      () => reprogramarReserva(c.id, destino),
                      o
                        ? `Cambiada: ahora tienes ${o.tipo} ${cuandoEs(o.fecha, hoy)} a las ${o.horaInicio}.`
                        : "Reserva cambiada.",
                    );
                  }}
                  className={`${BOTON} bg-dorado text-verde-900 hover:bg-dorado-dark`}
                >
                  {enCurso === c.id ? "Cambiando…" : "Confirmar cambio"}
                </button>
              </div>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="space-y-8">
      {/* Saludo: la fecha encima (eyebrow) y cuántas clases tiene. */}
      {vista === "inicio" && (
        <header className="text-center md:text-left">
          <p className="eyebrow text-dorado-tinta">{diaLargo(hoy)}</p>
          <h1 className="mt-2 font-display text-4xl text-verde sm:text-5xl">Hola, {nombre}</h1>
          <p className="mt-2 text-verde-700">
            {mias.length === 0
              ? "No tienes clases reservadas en los próximos días."
              : `Tienes ${mias.length} ${mias.length === 1 ? "clase reservada" : "clases reservadas"}.`}
          </p>
        </header>
      )}

      {/* En «Reservar», arriba: lo que le queda, para decidir antes de mirar
          la agenda. Sin plan, el porqué y adónde ir. */}
      {vista === "reservar" && (
        <section>
          <h1 className="font-display text-3xl text-verde sm:text-4xl">Reservar una clase</h1>
          {conPlan ? (
            cuenta.saldo.length > 0 && (
              <p className="mt-2 text-sm text-verde-700">
                Te quedan{" "}
                {cuenta.saldo.map((s, i) => (
                  <span key={s.tipo}>
                    {i > 0 && " · "}
                    <strong className="font-cifra text-verde">{s.quedan}</strong> de {s.tipo}
                  </span>
                ))}
                {cuenta.vencimiento && <> · hasta el {fechaCorta(cuenta.vencimiento, true)}</>}
              </p>
            )
          ) : (
            <p className="mt-3 rounded-2xl border border-dorado/50 bg-dorado/10 p-4 text-sm text-verde-700">
              {cuenta.estado === "De baja"
                ? "Tu cuenta está inactiva: escríbenos o pasa por recepción y la volvemos a activar."
                : "Para reservar necesitas un plan vigente. "}
              {cuenta.estado !== "De baja" && (
                <Link href="/mi-cuenta/planes" className="font-medium text-dorado-tinta underline underline-offset-4">
                  Ver los planes
                </Link>
              )}
            </p>
          )}
        </section>
      )}

      {/* Un solo mensaje para las dos acciones, leído por lectores de pantalla:
          nunca hay dos avisos a la vez. */}
      <div aria-live="polite">
        {mensaje && (
          <p
            className={`rounded-xl px-4 py-3 text-sm ${
              mensaje.tipo === "ok"
                ? "border border-[color-mix(in_srgb,var(--color-estado-ok)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-estado-ok)_10%,transparent)] text-[var(--color-estado-ok)]"
                : "border border-error/40 bg-error/5 text-error"
            }`}
          >
            {mensaje.texto}
          </p>
        )}
      </div>

      {/* Inicio: a la izquierda lo que se hace (plan, próxima clase,
          reservar); a la derecha el calendario de sus clases. En el móvil,
          una sola columna en ese orden. */}
      {vista === "inicio" && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
          <div className="min-w-0 space-y-6">
            <TarjetaPlan cuenta={cuenta} conPlan={conPlan} hoy={hoy} />

            {/* Sin plan ni reservas no se pinta: la tarjeta del plan ya
                dice por qué no puede reservar. */}
            {(conPlan || mias.length > 0) && (
              <ProximaClase
                clase={mias[0]}
                hoy={hoy}
                ahoraMin={ahora}
                conPlan={conPlan}
                acciones={mias[0] ? accionesDe(mias[0]) : null}
              />
            )}

            {/* El resto de sus reservas, en pequeño. */}
            {mias.length > 1 && (
              <section aria-labelledby="mas-reservas">
                <h2 id="mas-reservas" className="font-display text-2xl text-verde">
                  También reservaste
                </h2>
                <ul className="mt-3 grid gap-3">
                  {(todas ? mias.slice(1) : mias.slice(1, PROXIMAS_A_LA_VISTA)).map((c) => (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-beige bg-white p-4"
                    >
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-wider text-dorado-tinta first-letter:uppercase">
                          {diaRelativo(c.fecha, hoy)}
                        </p>
                        <p className="font-cifra text-lg font-normal text-verde">
                          {c.horaInicio} <span className="text-verde-300">→ {c.horaFin}</span>
                        </p>
                        <p className="truncate text-sm text-verde-700">
                          {c.tipo} · {c.instructora}
                        </p>
                      </div>
                      {accionesDe(c)}
                    </li>
                  ))}
                </ul>
                {mias.length > PROXIMAS_A_LA_VISTA && (
                  <button
                    type="button"
                    onClick={() => setTodas((v) => !v)}
                    aria-expanded={todas}
                    className="mt-1 inline-flex min-h-[44px] items-center text-sm text-dorado-tinta underline-offset-4 hover:underline"
                  >
                    {todas ? "Ver menos" : `Ver las ${mias.length - 1}`}
                  </button>
                )}
              </section>
            )}

            {/* En lista de espera: dónde está y cómo salir. */}
            {esperando.length > 0 && (
              <section aria-labelledby="esperando-cupo">
                <h2 id="esperando-cupo" className="font-display text-2xl text-verde">
                  Esperando cupo
                </h2>
                <p className="mt-1 text-sm text-verde-700">
                  Si alguien cancela con al menos {horasParaCancelar} h de antelación, entras solo y la
                  clase aparece en tus reservas (se descuenta de tu plan).
                </p>
                <ul className="mt-3 grid gap-3">
                  {esperando.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-dorado/60 bg-white p-4"
                    >
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-wider text-dorado-tinta first-letter:uppercase">
                          {diaRelativo(c.fecha, hoy)} · puesto {c.puestoEspera}
                        </p>
                        <p className="font-cifra text-lg font-normal text-verde">
                          {c.horaInicio} <span className="text-verde-300">→ {c.horaFin}</span>
                        </p>
                        <p className="truncate text-sm text-verde-700">
                          {c.tipo} · {c.instructora}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={enCurso === c.id}
                        onClick={() =>
                          ejecutar(
                            c.id,
                            () => salirListaEspera(c.id),
                            `Saliste de la lista de espera de ${c.tipo} de las ${c.horaInicio}.`,
                          )
                        }
                        className={`${BOTON} shrink-0 border border-verde/30 text-verde-700 hover:border-error/60 hover:text-error`}
                        aria-label={`Salir de la lista de espera de ${c.tipo}, ${diaRelativo(c.fecha, hoy).toLowerCase()} a las ${c.horaInicio}`}
                      >
                        Salir
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {conPlan && (
              <ConCupo
                clases={conCupoParaMi(agenda, cuenta.cobertura)}
                hoy={hoy}
                /* Abre la hoja de la clase: confirma antes de reservar
                   (decisión del usuario), igual que en «Reservar». */
                onReservar={(c) => setAbiertaId(c.id)}
              />
            )}
          </div>

          <div className="min-w-0">
            <HistorialMes historial={historial} agenda={agenda} hoy={hoy} />
          </div>
        </div>
      )}

      {/* Reservar: la semana y, en el móvil, el día como columna de horas; en
          escritorio, la semana entera en una tabla. Cada bloque abre la hoja. */}
      {vista === "reservar" && (
        <section aria-label="Agenda" className="space-y-5">
          <TiraSemana
            lunes={lunes}
            semanas={semanas}
            dia={dia}
            hoy={hoy}
            reservables={reservables}
            suyas={diasConClase}
            onSemana={(l) => setDia(l < hoy ? hoy : l)}
            onDia={setDia}
          />
          <ul aria-label="Leyenda" className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-verde-700">
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2 rounded-full bg-dorado" /> Con cupo
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-3.5 rounded bg-verde" /> Tu clase
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-3.5 rounded border border-beige bg-dorado/15" /> En espera
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-3.5 rounded border border-beige bg-arena" /> No disponible
            </li>
          </ul>
          <DiaPorHoras
            dia={dia}
            hoy={hoy}
            clases={agenda.filter((c) => c.fecha === dia)}
            estadoDe={estadoDe}
            onAbrir={(c) => setAbiertaId(c.id)}
          />
          <SemanaTabla
            lunes={lunes}
            hoy={hoy}
            clases={agenda.filter((c) => lunesDe(c.fecha) === lunes)}
            estadoDe={estadoDe}
            onAbrir={(c) => setAbiertaId(c.id)}
          />
        </section>
      )}

      {/* La hoja de la clase, para las dos vistas. Con `key`: cada clase abre
          una hoja limpia (sin el error ni el «Cambiar» de la anterior). */}
      {abierta && (
        <HojaClase
          key={abierta.id}
          clase={abierta}
          estado={estadoDe(abierta)}
          hoy={hoy}
          ahoraMin={ahora}
          horasParaCancelar={horasParaCancelar}
          destinos={abierta.reservada ? destinosPara(abierta) : []}
          onCerrar={() => setAbiertaId(null)}
        />
      )}
    </div>
  );
}
