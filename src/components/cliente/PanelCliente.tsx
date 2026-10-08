"use client";

import { useState, useTransition } from "react";
import { fecha as fechaCorta } from "@/lib/admin/format";
import { cuandoEs, diaCorto, diaRelativo, diasEntre, numeroDia } from "@/lib/admin/horario";
import {
  cancelarReserva,
  reprogramarReserva,
  reservarClase,
  salirListaEspera,
  unirmeListaEspera,
} from "@/lib/cliente/acciones";
import type { ClaseParaCliente, MiCuenta } from "@/lib/cliente/datos";

/** Recepción, para lo que no se puede hacer desde aquí. Mismo número que el
 *  footer de la web. */
const WHATSAPP = "https://wa.me/573209078814";

/** Cuántas próximas clases se enseñan antes de «Ver todas». En el móvil cada
 *  una ocupa ~90px: con 15 reservas, «Reservar una clase» quedaba a cuatro
 *  pantallas de distancia. */
const PROXIMAS_A_LA_VISTA = 3;

const BOTON =
  "inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-sm font-medium transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-60";

/** ¿Alguna membresía cubre ese día? Anuncia ANTES de pulsar lo que la base
 *  comprobará al reservar. */
function cubre(cuenta: MiCuenta, dia: string): boolean {
  return cuenta.cobertura.some((m) => m.inicio <= dia && dia <= m.vencimiento);
}

/**
 * ¿Falta más que el plazo de cancelación? `ahora` en minutos desde las 00:00
 * de hoy. Cuenta los días de diferencia: con un plazo de 24 h, una clase de
 * mañana a las 07:00 ya no se cancela a las 08:00 de hoy.
 */
function cancelable(c: ClaseParaCliente, hoy: string, ahoraMin: number, horas: number): boolean {
  const [h, m] = c.horaInicio.split(":").map(Number);
  const faltan = diasEntre(hoy, c.fecha) * 24 * 60 + h * 60 + m - ahoraMin;
  return faltan > horas * 60;
}

/**
 * El área de cliente: plan, próximas clases y reservar.
 *
 * Mobile-first: quien reserva lo hace casi siempre desde el móvil, camino del
 * estudio. Por eso la agenda es una tira de días que se desliza con el dedo
 * más una lista del día, como la agenda del panel, y no un calendario mensual
 * en el que no cabe ni la hora.
 */
export default function PanelCliente({
  cuenta,
  agenda,
  hoy,
  ahora: ahoraHHMM,
  horasParaCancelar,
}: {
  cuenta: MiCuenta;
  agenda: ClaseParaCliente[];
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
  const dias = [...new Set(agenda.map((c) => c.fecha))];
  const [dia, setDia] = useState(dias[0] ?? hoy);
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
  const delDia = agenda.filter((c) => c.fecha === dia);
  const nombre = cuenta.nombre.split(" ")[0];
  const conPlan = cuenta.estado !== "Sin plan" && cuenta.estado !== "Vencida";

  function ejecutar(
    claseId: string,
    accion: () => Promise<{ ok: boolean; error?: string }>,
    exito: string,
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
      setMensaje(
        r.ok ? { tipo: "ok", texto: exito } : { tipo: "error", texto: r.error ?? "Algo falló." },
      );
    });
  }

  const [hh, mm] = ahoraHHMM.split(":").map(Number);
  const ahora = hh * 60 + mm;

  return (
    <div className="space-y-8">
      {/* Saludo + plan */}
      <section className="grid gap-4 md:grid-cols-[1fr_minmax(0,22rem)] md:items-end">
        <div className="text-center md:text-left">
          <p className="eyebrow text-dorado-dark">Mi cuenta</p>
          <h1 className="mt-2 font-display text-4xl text-verde sm:text-5xl">Hola, {nombre}</h1>
          <p className="mt-2 text-verde-700">
            {mias.length === 0
              ? "No tienes clases reservadas en los próximos días."
              : `Tienes ${mias.length} ${mias.length === 1 ? "clase reservada" : "clases reservadas"}.`}
          </p>
        </div>

        {conPlan ? (
          <div className="rounded-2xl border border-beige bg-white p-5 shadow-soft">
            <p className="text-xs uppercase tracking-[0.14em] text-verde-300">Tu plan</p>
            <p className="mt-1 font-display text-2xl text-verde">{cuenta.plan}</p>
            <p className="mt-1 text-sm text-verde-700">
              {cuenta.estado === "Por vencer" ? "▲ Vence pronto · " : ""}
              Vigente hasta el {cuenta.vencimiento ? fechaCorta(cuenta.vencimiento, true) : "—"}
            </p>
            {/* Cuántas le quedan de cada tipo: cada reserva descuenta una, y
                cancelar dentro del plazo la devuelve. */}
            {cuenta.saldo.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {cuenta.saldo.map((s) => (
                  <li
                    key={s.tipo}
                    className={`rounded-full px-3 py-1 text-sm ${
                      s.quedan === 0 ? "bg-beige/60 text-verde-300" : "bg-dorado/15 text-verde"
                    }`}
                  >
                    <span className="font-cifra font-bold">{s.quedan}</span> de {s.total} · {s.tipo}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          /* Sin plan no se puede reservar (decisión del usuario). Se dice aquí,
             arriba, y no solo al pulsar «Reservar»: así nadie elige una clase
             para luego descubrir que no puede. */
          <div className="rounded-2xl border border-dorado/50 bg-dorado/10 p-5">
            <p className="font-display text-xl text-verde">
              {cuenta.estado === "Vencida" ? "Tu plan venció" : "Aún no tienes un plan"}
            </p>
            <p className="mt-1 text-sm text-verde-700">
              Para reservar necesitas un plan vigente. Actívalo en recepción o escríbenos y te
              ayudamos.
            </p>
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className={`${BOTON} mt-4 bg-verde text-arena hover:bg-verde-900`}
            >
              Escribir por WhatsApp
            </a>
          </div>
        )}
      </section>

      {/* Un solo mensaje para las dos acciones, leído por lectores de pantalla:
          nunca hay dos avisos a la vez. */}
      <div aria-live="polite">
        {mensaje && (
          <p
            className={`rounded-xl px-4 py-3 text-sm ${
              mensaje.tipo === "ok"
                ? "border border-[color-mix(in_srgb,var(--color-estado-ok)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-estado-ok)_10%,transparent)] text-[var(--color-estado-ok)]"
                : "border border-red-400/50 bg-red-50/70 text-red-700"
            }`}
          >
            {mensaje.texto}
          </p>
        )}
      </div>

      {/* Mis próximas clases */}
      {mias.length > 0 && (
        <section>
          <h2 className="font-display text-2xl text-verde">Tus próximas clases</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {(todas ? mias : mias.slice(0, PROXIMAS_A_LA_VISTA)).map((c) => {
              const puede = cancelable(c, hoy, ahora, horasParaCancelar);
              return (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-beige bg-white p-4"
                >
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wider text-dorado-dark first-letter:uppercase">
                      {diaRelativo(c.fecha, hoy)}
                    </p>
                    <p className="font-cifra text-lg font-normal text-verde">
                      {c.horaInicio} <span className="text-verde-300">→ {c.horaFin}</span>
                    </p>
                    <p className="truncate text-sm text-verde-700">
                      {c.tipo} · {c.instructora}
                    </p>
                  </div>
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
                        className={`${BOTON} border border-verde/30 text-verde-700 hover:border-red-400 hover:text-red-700`}
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
                        className="text-dorado-dark underline"
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
                </li>
              );
            })}
          </ul>
          {mias.length > PROXIMAS_A_LA_VISTA && (
            <button
              type="button"
              onClick={() => setTodas((v) => !v)}
              aria-expanded={todas}
              className="mt-3 text-sm text-dorado-dark underline-offset-4 hover:underline"
            >
              {todas ? "Ver menos" : `Ver las ${mias.length}`}
            </button>
          )}
        </section>
      )}

      {/* En lista de espera: dónde está y cómo salir. */}
      {esperando.length > 0 && (
        <section>
          <h2 className="font-display text-2xl text-verde">Esperando cupo</h2>
          <p className="mt-1 text-sm text-verde-700">
            Si alguien cancela con al menos {horasParaCancelar} h de antelación, entras solo y la
            clase aparece en «Tus próximas clases» (se descuenta de tu plan).
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {esperando.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-dorado/60 bg-white p-4"
              >
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-dorado-dark first-letter:uppercase">
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
                  className={`${BOTON} shrink-0 border border-verde/30 text-verde-700 hover:border-red-400 hover:text-red-700`}
                  aria-label={`Salir de la lista de espera de ${c.tipo}, ${diaRelativo(c.fecha, hoy).toLowerCase()} a las ${c.horaInicio}`}
                >
                  Salir
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Reservar */}
      <section>
        <h2 className="font-display text-2xl text-verde">Reservar una clase</h2>

        {dias.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-beige bg-white p-6 text-center text-verde-700">
            No hay clases programadas en los próximos días.
          </p>
        ) : (
          <>
            {/* Tira de días con clases: se desliza en móvil. */}
            <div
              role="group"
              aria-label="Elegir día"
              className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
            >
              {dias.map((d) => {
                const activo = d === dia;
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => setDia(d)}
                    className={`flex min-h-[60px] min-w-[56px] shrink-0 flex-col items-center justify-center rounded-2xl border px-3 transition-colors duration-300 ${
                      activo
                        ? "border-verde bg-verde text-arena"
                        : "border-beige bg-white text-verde-700 hover:border-dorado"
                    }`}
                  >
                    <span className="text-xs capitalize">{diaCorto(d)}</span>
                    <span className="font-cifra text-lg font-normal">{numeroDia(d)}</span>
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-sm font-medium text-dorado-dark first-letter:uppercase">
              {diaRelativo(dia, hoy)}
            </p>
            <ul className="mt-2 space-y-3">
              {delDia.map((c) => {
                const llena = c.libres === 0;
                const sinPlan = !cubre(cuenta, c.fecha);
                // Las privadas se piden en recepción; si no le quedan de ese
                // tipo para ese día, se dice antes de pulsar.
                const privada = c.disponibles === null;
                const sinClases = !sinPlan && !privada && (c.disponibles ?? 0) <= 0;
                const motivo = privada
                  ? "En recepción"
                  : llena
                    ? "Llena"
                    : sinPlan
                      ? "Sin plan ese día"
                      : sinClases
                        ? `Sin clases de ${c.tipo}`
                        : null;
                return (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-beige bg-white p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-cifra text-lg font-normal text-verde">
                        {c.horaInicio} <span className="text-verde-300">→ {c.horaFin}</span>
                      </p>
                      <p className="text-sm text-verde-700">
                        <span className="font-bold text-verde">{c.tipo}</span> · {c.instructora}
                      </p>
                      <p className="text-xs text-verde-300">
                        {llena
                          ? "Sin cupos libres"
                          : `${c.libres} ${c.libres === 1 ? "cupo libre" : "cupos libres"}`}
                      </p>
                    </div>
                    {c.reservada ? (
                      <span className="inline-flex min-h-[44px] items-center rounded-full bg-dorado/15 px-4 text-sm text-dorado-dark">
                        ✓ Reservada
                      </span>
                    ) : c.puestoEspera !== null ? (
                      <span className="inline-flex min-h-[44px] items-center rounded-full border border-dashed border-dorado/60 px-4 text-sm text-dorado-dark">
                        En espera · puesto {c.puestoEspera}
                      </span>
                    ) : llena && !privada && !sinPlan && !sinClases ? (
                      /* Llena, pero podría entrar: lista de espera en vez de un
                         botón apagado que no ofrece nada. */
                      <button
                        type="button"
                        disabled={enCurso === c.id}
                        onClick={() => {
                          setMensaje(null);
                          setEnCurso(c.id);
                          iniciar(async () => {
                            const r = await unirmeListaEspera(c.id);
                            setEnCurso(null);
                            setMensaje(
                              r.ok
                                ? {
                                    tipo: "ok",
                                    texto: `Estás en la lista de espera (puesto ${r.puesto ?? "?"}). Si se libera un cupo con al menos ${horasParaCancelar} h de antelación, entras solo.`,
                                  }
                                : { tipo: "error", texto: r.error },
                            );
                          });
                        }}
                        className={`${BOTON} w-full border border-dorado text-verde hover:bg-dorado/15 sm:w-auto`}
                        aria-label={`Apuntarme a la lista de espera de ${c.tipo}, ${diaRelativo(c.fecha, hoy).toLowerCase()} a las ${c.horaInicio}`}
                      >
                        {enCurso === c.id ? "Un momento…" : "Lista de espera"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={motivo !== null || enCurso === c.id}
                        onClick={() =>
                          ejecutar(
                            c.id,
                            () => reservarClase(c.id),
                            `¡Listo! Reservaste ${c.tipo} ${cuandoEs(c.fecha, hoy)} a las ${c.horaInicio}.`,
                          )
                        }
                        className={`${BOTON} w-full bg-dorado text-verde-900 hover:bg-dorado-dark sm:w-auto`}
                        aria-label={`Reservar ${c.tipo}, ${diaRelativo(c.fecha, hoy).toLowerCase()} a las ${c.horaInicio}`}
                        /* El porqué de un botón apagado, para quien pasa el
                           ratón y para quien usa lector de pantalla. */
                        title={
                          privada
                            ? "Las clases privadas se reservan en recepción"
                            : llena
                              ? "La clase está llena"
                              : sinPlan
                                ? "Tu plan no cubre ese día"
                                : sinClases
                                  ? `Ya usaste todas tus clases de ${c.tipo} de este plan`
                                  : undefined
                        }
                      >
                        {enCurso === c.id ? "Reservando…" : (motivo ?? "Reservar")}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
