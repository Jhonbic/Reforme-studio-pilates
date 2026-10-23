"use client";

import { useState } from "react";
import Card from "@/components/admin/Card";
import { useToast } from "@/context/ToastContext";
import { numero } from "@/lib/admin/format";
import { diaLargo, diaRelativo, diaSemana } from "@/lib/admin/horario";
import type { ClaseEnAgenda, HorasDelEstudio, MiembroEquipo, Sala, SalaId } from "@/lib/admin/types";
import FormularioClase from "./FormularioClase";
import QuitarClase from "./QuitarClase";
import ReservasClase, { type ClienteParaReservar } from "./ReservasClase";
import SelectorDia from "./SelectorDia";
import TarjetaClase from "./TarjetaClase";
import { TODAS_LAS_SALAS, useSalaRecordada, type FiltroSala } from "./useSalaRecordada";

/* La rejilla del día: hora + una columna por sala visible. Cabecera y filas
   comparten la parte de escritorio. En el móvil la hora va en una columna
   estrecha a la IZQUIERDA (no encima): ahorra una línea por hora. */
const COLS_ESCRITORIO = {
  2: "md:grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)]",
  1: "md:grid-cols-[5.5rem_minmax(0,1fr)]",
} as const;
const COLS_MOVIL = "grid-cols-[3.25rem_minmax(0,1fr)]";

const PASTILLA =
  "inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border px-3 text-sm transition-[border-color,box-shadow,background-color,color] duration-300 sm:px-4";

const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center gap-2 overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde";

const SELECT =
  "min-h-[44px] rounded-full border border-beige bg-white px-4 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado/60";

/** El botón de salida de los estados vacíos. */
const SALIDA =
  "mt-5 inline-flex min-h-[44px] items-center rounded-full border border-verde/40 px-5 text-sm text-verde transition-colors duration-300 hover:border-verde hover:bg-verde hover:text-arena";

const TODAS = "Todas";

/**
 * Agenda del estudio: un día a la vez, en una rejilla hora × sala.
 *
 * ⚠️ **Rejilla y no lista** (oct 2026): con dos salas, la lista mezclaba las
 * clases de Reformer y de Mat y no se veía qué sala quedaba libre a cada hora.
 * Ahora cada sala tiene su columna, y un hueco libre se
 * programa desde ahí mismo («+ Programar aquí», con hora y sala ya puestas).
 *
 * ⚠️ **Un día y no un mes.** Un calendario mensual enseña 30 casillas donde no
 * cabe ni la hora ni quién da la clase, que es justo lo que hay que ver; y con
 * seis clases diarias, la casilla del día se convierte en una lista ilegible
 * dentro de un cuadradito. La tira de la semana da el salto rápido y el día
 * abierto da el detalle.
 *
 * Guarda en Supabase desde oct 2026 (`lib/admin/acciones.ts`). Las acciones
 * revalidan la página, así que la agenda se actualiza sola al cerrar cada
 * diálogo. Las instructoras la ven sin botones (`puedeEditar`).
 */
export default function PanelClases({
  clases,
  instructoras,
  clientes,
  puedeEditar,
  miEquipoId,
  salas,
  horasDelEstudio,
  ahora,
  hoy,
}: {
  clases: ClaseEnAgenda[];
  instructoras: MiembroEquipo[];
  /** Para apuntar gente a una clase. Vacío si quien mira no puede. */
  clientes: ClienteParaReservar[];
  puedeEditar: boolean;
  /** Id en `equipo` de quien mira: la instructora marca la asistencia de sus clases. */
  miEquipoId: string | null;
  /** Las salas y su aforo, para el formulario. */
  salas: Sala[];
  /** Las horas a las que abre el estudio cada día: la agenda pinta un hueco en cada una. */
  horasDelEstudio: HorasDelEstudio;
  /** Hora de Bogotá («20:15»): hoy, las horas que ya pasaron no se ofrecen. */
  ahora: string;
  hoy: string;
}) {
  /** La clase cuyo diálogo de reservas está abierto. Por ID y no el objeto:
   *  tras apuntar o quitar, la agenda se revalida y el diálogo lee la versión
   *  nueva. */
  const [viendo, setViendo] = useState<string | null>(null);
  const { mostrarAviso } = useToast();
  const [dia, setDia] = useState(hoy);
  const [instructora, setInstructora] = useState<string>(TODAS);
  const [formAbierto, setFormAbierto] = useState(false);
  /* `undefined` = alta. La clase concreta = edición. */
  const [editando, setEditando] = useState<ClaseEnAgenda | undefined>();
  const [propuesta, setPropuesta] = useState<{ horaInicio: string; sala: SalaId } | undefined>();
  const [quitando, setQuitando] = useState<ClaseEnAgenda | null>(null);
  /* Recordada en este dispositivo: quien solo lleva Reformer no filtra cada
     vez. Ver `useSalaRecordada`. */
  const [sala, setSala] = useSalaRecordada(salas.map((s) => s.id));
  const unaSala = sala !== TODAS_LAS_SALAS;
  const salasVisibles = unaSala ? salas.filter((s) => s.id === sala) : salas;
  const colsEscritorio = COLS_ESCRITORIO[salasVisibles.length === 1 ? 1 : 2];

  const porInstructora =
    instructora === TODAS ? clases : clases.filter((c) => c.instructoraId === instructora);
  const filtrada = unaSala ? porInstructora.filter((c) => c.sala === sala) : porInstructora;

  /* Los números de la tira siguen a los filtros a propósito: si el filtro
     dijera 7 y el día abierto enseñara 2, el que estaría mintiendo sería el
     número. Las canceladas no se cuentan — no van a ocurrir. */
  const conteos: Record<string, number> = {};
  for (const c of filtrada) {
    if (!c.cancelada) conteos[c.fecha] = (conteos[c.fecha] ?? 0) + 1;
  }

  /* Clases vivas del día en cada sala, para las pastillas del filtro. Siguen
     al filtro de instructora (no al de sala: si no, la pastilla de la sala que
     no está elegida diría siempre 0). */
  const porSala: Record<string, number> = {};
  for (const c of porInstructora) {
    if (c.fecha === dia && !c.cancelada) porSala[c.sala] = (porSala[c.sala] ?? 0) + 1;
  }
  const totalDia = Object.values(porSala).reduce((t, n) => t + n, 0);

  /* `clases` ya viene ordenada por fecha y hora desde `getClases()`, así que
     filtrar conserva el orden: no hace falta volver a ordenar aquí. */
  const delDia = filtrada.filter((c) => c.fecha === dia);

  const vivas = delDia.filter((c) => !c.cancelada);
  const cupos = vivas.reduce((t, c) => t + c.cupos, 0);
  const reservas = vivas.reduce((t, c) => t + c.reservas, 0);

  const relativo = diaRelativo(dia, hoy);
  const largo = diaLargo(dia);

  function abrirAlta(hueco?: { horaInicio: string; sala: SalaId }) {
    setEditando(undefined);
    setPropuesta(hueco);
    setFormAbierto(true);
  }

  /* Programar en un hueco solo tiene sentido viendo la agenda entera de un
     día que no ha pasado: con un filtro puesto, el hueco puede no estarlo. */
  const huecosProgramables = puedeEditar && instructora === TODAS && dia >= hoy;
  /* Las horas del día: las de apertura del estudio (así un día vacío ya enseña
     dónde se puede programar, sin ir a otra pantalla) más las de sus clases,
     por si alguna se puso a una hora suelta. Mirando el pasado o con filtro,
     solo las de sus clases: un hueco que no se puede usar es ruido. */
  const horas = [
    ...new Set([
      ...(huecosProgramables
        ? (horasDelEstudio[diaSemana(dia) + 1] ?? []).filter((h) => dia > hoy || h > ahora)
        : []),
      ...delDia.map((c) => c.horaInicio),
    ]),
  ].sort();

  function abrirEdicion(c: ClaseEnAgenda) {
    setEditando(c);
    setFormAbierto(true);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Lo único que hay que saber para usar la pantalla, dicho una vez. */}
        <p className="max-w-xl text-sm text-verde-700">
          {puedeEditar
            ? "Elige una sala y pulsa una hora libre para programar una clase: solo ese día o todas las semanas."
            : "La agenda del estudio: qué clases hay cada día y quién las da."}
        </p>

        <div className="flex flex-wrap gap-2">
          {puedeEditar && (
            <button type="button" onClick={() => abrirAlta()} className={BOTON}>
              {/* `--lento` (1 s) porque es un botón de cabecera: en un control de
              ~150px, a 0,55 s el barrido termina antes de que el ojo lo
              registre. Va en el `<span>`, que es donde lo ponen «Exportar» y
              «Nuevo cliente». */}
              <span className="control-sheen control-sheen--lento" aria-hidden="true" />
              <span aria-hidden="true">+</span>
              Nueva clase
            </button>
          )}
        </div>
      </div>

      {/* `resalte={false}` por lo mismo que el listado de Usuarios: la tarjeta
          ocupa casi toda la pantalla, el cursor está siempre dentro y encender
          el borde no señalaría nada — solo enmarcaría la página en dorado. */}
      {/* ⚠️ `Card` no acepta atributos ARIA arbitrarios (sus props son `tono`,
          `densidad`, `fx`, `sheen`, `resalte`, `as`, `className` e `id`) y no se
          abre su API por un solo uso: el `<h2>` del día de abajo ya nombra este
          bloque. */}
      <Card densidad="plana" resalte={false} className="mt-4">
        <SelectorDia dia={dia} hoy={hoy} conteos={conteos} onDia={setDia} />

        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-beige px-4 py-4 sm:px-5">
          <div className="min-w-0">
            {/* El «Hoy / Mañana / Ayer» solo aparece cuando dice algo que la
                fecha larga no dice. Repetido siempre sería ruido. */}
            {relativo !== largo && (
              <p className="text-xs uppercase tracking-wider text-dorado-tinta">{relativo}</p>
            )}
            <h2 className="font-display text-xl text-verde first-letter:uppercase">{largo}</h2>
            <p className="text-sm text-verde-300">
              {vivas.length === 0
                ? "Sin clases programadas"
                : `${numero(vivas.length)} ${vivas.length === 1 ? "clase" : "clases"} · ${numero(reservas)} de ${numero(cupos)} cupos reservados`}
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {/* Filtro de sala (oct 2026): en el móvil, ver la sala de Mat
                apilada bajo cada hora de Reformer cansaba. Mismo idioma que
                las pastillas de estado de Usuarios: la elegida en dorado; el
                borde existe siempre y al pasar se engorda con un `ring`, no
                con `border-2`, que movería el texto. Sin dash. */}
            <div
              role="group"
              aria-label="Filtrar por sala"
              className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto"
            >
              {(
                [
                  { id: TODAS_LAS_SALAS, texto: "Todas", n: totalDia },
                  ...salas.map((s) => ({ id: s.id, texto: s.id, n: porSala[s.id] ?? 0 })),
                ] as { id: FiltroSala; texto: string; n: number }[]
              ).map((o) => {
                const activa = o.id === sala;
                return (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={activa}
                    aria-label={`${o.id === TODAS_LAS_SALAS ? "Todas las salas" : `Sala de ${o.texto}`} · ${o.n} ${o.n === 1 ? "clase" : "clases"}`}
                    onClick={() => setSala(o.id)}
                    className={`${PASTILLA} ${
                      activa
                        ? "border-dorado bg-dorado text-verde-900"
                        : "border-beige bg-white text-verde-700 hover:border-dorado hover:text-verde hover:ring-2 hover:ring-dorado/25"
                    }`}
                  >
                    {o.texto}
                    <span
                      aria-hidden="true"
                      className={`font-cifra text-xs ${activa ? "text-verde-900" : "text-verde-300"}`}
                    >
                      {numero(o.n)}
                    </span>
                  </button>
                );
              })}
            </div>

            <label htmlFor="filtro-instructora" className="sr-only">
              Filtrar por instructora
            </label>
            <select
              id="filtro-instructora"
              value={instructora}
              onChange={(e) => setInstructora(e.target.value)}
              className={`${SELECT} w-full sm:w-auto`}
            >
              <option value={TODAS}>Todas las instructoras</option>
              {instructoras.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {horas.length === 0 ? (
          <div className="px-4 py-14 text-center sm:px-5">
            <p className="font-display text-xl text-verde">
              {instructora !== TODAS
                ? unaSala
                  ? "Esa instructora no da clase en esa sala ese día"
                  : "Esa instructora no da clase ese día"
                : unaSala
                  ? `La sala de ${sala} no tiene clases ese día`
                  : "No hay clases programadas"}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-verde-300">
              {instructora !== TODAS || unaSala
                ? "Prueba con otro día, o quita el filtro para ver la agenda completa."
                : huecosProgramables
                  ? "El estudio no abre este día. Si hace falta, puedes programar una clase igualmente."
                  : "Ni una sola clase este día. Mira otro día en la tira de arriba."}
            </p>

            {/* Siempre una salida, como `EstadoVacio` del listado: quien no
                encuentra nada suele tener un filtro puesto sin darse cuenta. */}
            {instructora !== TODAS ? (
              <button type="button" onClick={() => setInstructora(TODAS)} className={SALIDA}>
                Ver todas las instructoras
              </button>
            ) : unaSala ? (
              <button type="button" onClick={() => setSala(TODAS_LAS_SALAS)} className={SALIDA}>
                Ver todas las salas
              </button>
            ) : (
              huecosProgramables && (
                <button type="button" onClick={() => abrirAlta()} className={SALIDA}>
                  Programar una clase
                </button>
              )
            )}
          </div>
        ) : (
          <>
            {/* ⚠️ «Todas» en el MÓVIL enseña solo las clases (decisión del
                usuario): con las dos salas apiladas por hora salían ~18 cajas,
                casi todas huecos vacíos. Los huecos se ven eligiendo una sala.
                En escritorio, «Todas» sigue con las dos columnas y sus huecos:
                ahí cabe y se compara de un vistazo. Todo con CSS (`md:`), un
                solo DOM, sin leer el ancho de pantalla en JS. */}
            {!unaSala && huecosProgramables && (
              <p className="border-b border-beige bg-arena/60 px-4 py-3 text-sm text-verde-700 md:hidden">
                Elige una sala arriba para ver sus horas libres y programar.
              </p>
            )}
            {!unaSala && delDia.length === 0 && (
              <p className="px-4 py-12 text-center font-display text-xl text-verde md:hidden">
                No hay clases programadas
              </p>
            )}

            {/* Rótulos de columna, solo en escritorio: en móvil cada tarjeta
                dice su sala. `aria-hidden` porque esto no es una tabla: la
                sala va dentro de cada tarjeta para el lector de pantalla. */}
            <div
              aria-hidden="true"
              className={`hidden gap-4 px-5 pt-4 text-xs font-bold uppercase tracking-[0.14em] text-verde-300 md:grid ${colsEscritorio}`}
            >
              <span>Hora</span>
              {salasVisibles.map((s) => (
                <span key={s.id}>{s.nombre}</span>
              ))}
            </div>
            <ul className="md:mt-2">
              {horas.map((h) => {
                const deLaHora = delDia.filter((c) => c.horaInicio === h);
                const libre = huecosProgramables && (dia > hoy || h > ahora);
                return (
                  <li
                    key={h}
                    /* «Todas» en el móvil: una hora sin clases no se pinta. */
                    className={`${!unaSala && deLaHora.length === 0 ? "hidden md:grid" : "grid"} items-start gap-x-3 border-t border-beige px-4 py-3 sm:px-5 md:gap-4 md:py-4 ${COLS_MOVIL} ${colsEscritorio}`}
                  >
                    <p className="pt-2.5 font-cifra text-base text-verde md:pt-3 md:text-lg">{h}</p>
                    {/* En el móvil las salas se apilan en la segunda columna;
                        en escritorio `md:contents` las devuelve a la rejilla,
                        una columna cada una. */}
                    <div className="flex min-w-0 flex-col gap-3 md:contents">
                      {salasVisibles.map((s) => {
                        const aqui = deLaHora.filter((c) => c.sala === s.id);
                        if (aqui.length > 0)
                          return (
                            <div key={s.id} className="flex min-w-0 flex-col gap-3">
                              {aqui.map((c) => (
                                <TarjetaClase
                                  key={c.id}
                                  clase={c}
                                  puedeEditar={puedeEditar}
                                  miEquipoId={miEquipoId}
                                  onEditar={() => abrirEdicion(c)}
                                  onQuitar={() => setQuitando(c)}
                                  onReservas={() => setViendo(c.id)}
                                />
                              ))}
                            </div>
                          );

                        const etiqueta = `Programar una clase en la ${s.nombre.toLowerCase()} a las ${h}`;

                        /* Con UNA sala, el hueco es una fila fina de 44 px
                           (decisión del usuario): se lee como «aquí no hay
                           nada» y no como una tarjeta más que mirar. */
                        if (unaSala)
                          return libre ? (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => abrirAlta({ horaInicio: h, sala: s.id })}
                              aria-label={etiqueta}
                              className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-lg border border-dashed border-beige px-3 text-sm text-verde-300 transition-colors duration-300 hover:border-dorado hover:bg-arena/50 hover:text-verde"
                            >
                              <span>Libre</span>
                              <span className="font-medium text-verde-700">
                                <span aria-hidden="true">+ </span>Programar
                              </span>
                            </button>
                          ) : (
                            <p
                              key={s.id}
                              className="flex min-h-[44px] items-center px-3 text-sm text-verde-300"
                            >
                              Libre
                            </p>
                          );

                        /* «Todas»: el recuadro de siempre, solo en escritorio. */
                        return libre ? (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => abrirAlta({ horaInicio: h, sala: s.id })}
                            aria-label={etiqueta}
                            className="hidden min-h-[64px] items-center justify-center gap-2 rounded-xl border border-dashed border-beige text-sm text-verde-300 transition-colors duration-300 hover:border-dorado hover:bg-arena/50 hover:text-verde md:flex"
                          >
                            <span aria-hidden="true">+</span>
                            <span>Programar aquí</span>
                          </button>
                        ) : (
                          <div
                            key={s.id}
                            aria-hidden="true"
                            className="hidden min-h-[64px] items-center justify-center rounded-xl border border-dashed border-beige text-sm text-verde-300 md:flex"
                          >
                            Libre
                          </div>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      <FormularioClase
        abierto={formAbierto}
        clase={editando}
        /* No se propone un día que ya pasó: mirando el lunes de la semana
           pasada, «Nueva clase» abre en hoy y no en un día imposible. */
        fechaPorDefecto={dia < hoy ? hoy : dia}
        propuesta={propuesta}
        hoy={hoy}
        instructoras={instructoras}
        salas={salas}
        clases={clases}
        onCerrar={() => setFormAbierto(false)}
        onGuardado={(mensaje) => mostrarAviso(mensaje, "success")}
      />

      {/* Cancelar o eliminar (y, si se repite, solo esta o todas): ver `QuitarClase`. */}
      <QuitarClase
        clase={quitando}
        onCerrar={() => setQuitando(null)}
        onHecho={(mensaje, ok) => mostrarAviso(mensaje, ok ? "success" : "warning")}
      />

      <ReservasClase
        clase={clases.find((c) => c.id === viendo) ?? null}
        agenda={clases}
        hoy={hoy}
        clientes={clientes}
        puedeEditar={puedeEditar}
        miEquipoId={miEquipoId}
        onCerrar={() => setViendo(null)}
      />
    </>
  );
}
