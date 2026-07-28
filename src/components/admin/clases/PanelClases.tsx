"use client";

import { useState } from "react";
import Card from "@/components/admin/Card";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/context/ToastContext";
import { numero } from "@/lib/admin/format";
import { diaLargo, diaRelativo } from "@/lib/admin/horario";
import type { ClaseEnAgenda, MiembroEquipo } from "@/lib/admin/types";
import FilaClase from "./FilaClase";
import FormularioClase from "./FormularioClase";
import SelectorDia from "./SelectorDia";

const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center gap-2 overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde";

const SELECT =
  "min-h-[44px] rounded-full border border-beige bg-white px-4 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado/60";

const TODAS = "Todas";

/**
 * Agenda del estudio: un día a la vez.
 *
 * ⚠️ **Un día y no un mes.** Un calendario mensual enseña 30 casillas donde no
 * cabe ni la hora ni quién da la clase, que es justo lo que hay que ver; y con
 * seis clases diarias, la casilla del día se convierte en una lista ilegible
 * dentro de un cuadradito. La tira de la semana da el salto rápido y el día
 * abierto da el detalle.
 *
 * ⚠️ **Ninguna acción guarda**, y las tres lo dicen. El horario vive en
 * `mock.ts` como constante de módulo: mutarlo desde aquí se perdería en el
 * siguiente render del servidor y *parecería* que funciona. Mismo criterio que
 * el catálogo de planes y el alta de cliente.
 */
export default function PanelClases({
  clases,
  instructoras,
  hoy,
}: {
  clases: ClaseEnAgenda[];
  instructoras: MiembroEquipo[];
  hoy: string;
}) {
  const { mostrarAviso } = useToast();
  const [dia, setDia] = useState(hoy);
  const [instructora, setInstructora] = useState<string>(TODAS);
  const [formAbierto, setFormAbierto] = useState(false);
  /* `undefined` = alta. La clase concreta = edición. */
  const [editando, setEditando] = useState<ClaseEnAgenda | undefined>();
  const [quitando, setQuitando] = useState<ClaseEnAgenda | null>(null);

  const filtrada =
    instructora === TODAS
      ? clases
      : clases.filter((c) => c.instructoraId === instructora);

  /* Los números de la tira siguen al filtro a propósito: si el filtro dijera 7
     y el día abierto enseñara 2, el que estaría mintiendo sería el número.
     Las canceladas no se cuentan — no van a ocurrir. */
  const conteos: Record<string, number> = {};
  for (const c of filtrada) {
    if (!c.cancelada) conteos[c.fecha] = (conteos[c.fecha] ?? 0) + 1;
  }

  /* `clases` ya viene ordenada por fecha y hora desde `getClases()`, así que
     filtrar conserva el orden: no hace falta volver a ordenar aquí. */
  const delDia = filtrada.filter((c) => c.fecha === dia);

  const vivas = delDia.filter((c) => !c.cancelada);
  const cupos = vivas.reduce((t, c) => t + c.cupos, 0);
  const reservas = vivas.reduce((t, c) => t + c.reservas, 0);

  const relativo = diaRelativo(dia, hoy);
  const largo = diaLargo(dia);

  function abrirAlta() {
    setEditando(undefined);
    setFormAbierto(true);
  }

  function abrirEdicion(c: ClaseEnAgenda) {
    setEditando(c);
    setFormAbierto(true);
  }

  const hayReservas = (quitando?.reservas ?? 0) > 0;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-verde-300">
          {vivas.length === 0
            ? "Sin clases programadas"
            : `${numero(vivas.length)} ${vivas.length === 1 ? "clase" : "clases"} · ${numero(reservas)} de ${numero(cupos)} cupos reservados`}
        </p>

        <button type="button" onClick={abrirAlta} className={BOTON}>
          {/* `--lento` (1 s) porque es un botón de cabecera: en un control de
              ~150px, a 0,55 s el barrido termina antes de que el ojo lo
              registre. Va en el `<span>`, que es donde lo ponen «Exportar» y
              «Nuevo cliente». */}
          <span className="control-sheen control-sheen--lento" aria-hidden="true" />
          <span aria-hidden="true">+</span>
          Nueva clase
        </button>
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
              <p className="text-xs uppercase tracking-wider text-dorado-dark">
                {relativo}
              </p>
            )}
            <h2 className="font-display text-xl text-verde first-letter:uppercase">
              {largo}
            </h2>
          </div>

          <div>
            <label htmlFor="filtro-instructora" className="sr-only">
              Filtrar por instructora
            </label>
            <select
              id="filtro-instructora"
              value={instructora}
              onChange={(e) => setInstructora(e.target.value)}
              className={SELECT}
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

        {delDia.length === 0 ? (
          <div className="px-4 py-14 text-center sm:px-5">
            <p className="font-display text-xl text-verde">
              {instructora === TODAS
                ? "No hay clases programadas"
                : "Esa instructora no da clase ese día"}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-verde-300">
              {instructora === TODAS
                ? "Ni una sola clase este día. Puedes programar la primera o mirar otro día en la tira de arriba."
                : "Prueba con otro día, o quita el filtro para ver la agenda completa."}
            </p>

            {/* Siempre una salida, como `EstadoVacio` del listado: quien no
                encuentra nada suele tener un filtro puesto sin darse cuenta. */}
            {instructora === TODAS ? (
              <button
                type="button"
                onClick={abrirAlta}
                className="mt-5 inline-flex min-h-[44px] items-center rounded-full border border-verde/40 px-5 text-sm text-verde transition-colors duration-300 hover:border-verde hover:bg-verde hover:text-arena"
              >
                Programar una clase
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setInstructora(TODAS)}
                className="mt-5 inline-flex min-h-[44px] items-center rounded-full border border-verde/40 px-5 text-sm text-verde transition-colors duration-300 hover:border-verde hover:bg-verde hover:text-arena"
              >
                Ver todas las instructoras
              </button>
            )}
          </div>
        ) : (
          <ul>
            {delDia.map((c) => (
              <FilaClase
                key={c.id}
                clase={c}
                onEditar={() => abrirEdicion(c)}
                onQuitar={() => setQuitando(c)}
              />
            ))}
          </ul>
        )}
      </Card>

      <FormularioClase
        abierto={formAbierto}
        clase={editando}
        /* No se propone un día que ya pasó: mirando el lunes de la semana
           pasada, «Nueva clase» abre en hoy y no en un día imposible. */
        fechaPorDefecto={dia < hoy ? hoy : dia}
        hoy={hoy}
        instructoras={instructoras}
        clases={clases}
        onCerrar={() => setFormAbierto(false)}
        onGuardado={(resumen, esNueva) =>
          mostrarAviso(
            esNueva
              ? `La clase (${resumen}) NO se ha creado: el horario todavía vive en el código. Llegará con la base de datos.`
              : `Los cambios (${resumen}) NO se han guardado: el horario todavía vive en el código.`,
            "warning",
          )
        }
      />

      {/* ⚠️ Cancelar y eliminar NO son la misma acción, y lo que las separa es
          si hay alguien apuntado. Una clase con reservas se **cancela**: el
          registro se queda (y sale «Cancelada» en la agenda) porque hay personas
          a las que avisar. Una clase vacía es un error de horario y se
          **elimina**. Es la misma distinción que en la base de datos impide
          borrar un pago: lo que ya afectó a alguien no se reescribe. */}
      <ConfirmDialog
        abierto={quitando !== null}
        titulo={
          hayReservas
            ? `¿Cancelar ${quitando?.tipo} de las ${quitando?.horaInicio}?`
            : `¿Eliminar ${quitando?.tipo} de las ${quitando?.horaInicio}?`
        }
        mensaje={
          quitando && hayReservas
            ? `${numero(quitando.reservas)} ${
                quitando.reservas === 1
                  ? "persona la tiene"
                  : "personas la tienen"
              } reservada. La clase se queda en la agenda marcada como «Cancelada» para que quede constancia, pero hay que avisar ${quitando.reservas === 1 ? "a esa persona" : "a esas personas"} una por una: el sistema todavía no manda ningún mensaje.`
            : "Nadie la ha reservado, así que no afecta a nadie. Desaparecerá del horario y esta acción no se puede deshacer."
        }
        textoConfirmar={hayReservas ? "Cancelar la clase" : "Eliminar clase"}
        /* «Cancelar» a secas se confundiría con el botón de cerrar el diálogo. */
        textoCancelar="Volver"
        variante="peligro"
        onConfirmar={() => {
          const que = `${quitando?.tipo} de las ${quitando?.horaInicio}`;
          const era = hayReservas;
          setQuitando(null);
          mostrarAviso(
            era
              ? `La clase (${que}) NO se ha cancelado: el horario todavía vive en el código.`
              : `La clase (${que}) NO se ha eliminado: el horario todavía vive en el código.`,
            "warning",
          );
        }}
        onCancelar={() => setQuitando(null)}
      />
    </>
  );
}
