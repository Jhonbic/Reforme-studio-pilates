"use client";

import { useState, useTransition } from "react";
import Modal from "@/components/admin/Modal";
import { cancelarClase, eliminarClase, quitarClaseSemanal } from "@/lib/admin/acciones";
import { numero } from "@/lib/admin/format";
import { cadaSemana, diaLargo } from "@/lib/admin/horario";
import type { ClaseEnAgenda } from "@/lib/admin/types";
import Opciones from "./Opciones";

const PELIGRO =
  "inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--color-estado-grave)] px-5 text-sm font-medium text-white transition-colors duration-300 hover:bg-[color-mix(in_srgb,var(--color-estado-grave)_85%,black)] disabled:cursor-not-allowed disabled:opacity-70";
const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center justify-center gap-2 overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde";

/**
 * Quitar una clase de la agenda.
 *
 * ⚠️ Cancelar y eliminar NO son la misma acción, y lo que las separa es si hay
 * alguien apuntado. Con reservas se **cancela**: se queda en la agenda marcada
 * «Cancelada», con su gente, para saber a quién avisar (el sistema todavía no
 * manda mensajes). Sin nadie, se **elimina**.
 *
 * Si la clase se repite cada semana, primero se pregunta a qué afecta: «solo
 * esta» o «todas las próximas» (las sin reservas se borran, las que tienen
 * gente se cancelan). Mismo patrón que el calendario del móvil.
 *
 * El botón de cerrar dice «Volver» y no «Cancelar»: en un diálogo donde
 * «cancelar» es la acción destructiva, dos «Cancelar» seguidos son una trampa.
 */
export default function QuitarClase({
  clase,
  onCerrar,
  onHecho,
}: {
  clase: ClaseEnAgenda | null;
  onCerrar: () => void;
  onHecho: (mensaje: string, ok: boolean) => void;
}) {
  const [alcance, setAlcance] = useState<"esta" | "todas">("esta");
  const [quitando, iniciar] = useTransition();
  /* Al abrir otra clase, vuelve a «solo esta». */
  const [ultima, setUltima] = useState(clase?.id);
  if (clase?.id !== ultima) {
    setUltima(clase?.id);
    setAlcance("esta");
  }

  if (!clase) return null;
  const hayReservas = clase.reservas > 0;
  const que = `${clase.tipo} de las ${clase.horaInicio}`;
  const cada = cadaSemana(clase.fecha);
  const todas = clase.franjaId !== null && alcance === "todas";

  function confirmar() {
    if (!clase) return;
    iniciar(async () => {
      if (todas) {
        const r = await quitarClaseSemanal(clase.franjaId!);
        onHecho(r.ok ? `${que} ya no se repite ${cada}: ${r.resumen ?? ""}.` : r.error, r.ok);
      } else {
        const r = hayReservas ? await cancelarClase(clase.id) : await eliminarClase(clase.id);
        onHecho(
          r.ok
            ? hayReservas
              ? `Clase cancelada (${que}, ${diaLargo(clase.fecha)}). Avisa a quienes la tenían reservada.`
              : `Clase eliminada (${que}, ${diaLargo(clase.fecha)}).`
            : r.error,
          r.ok,
        );
      }
      onCerrar();
    });
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      cerrable={!quitando}
      titulo={`¿Quitar ${que}?`}
      tamano="md"
      pie={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCerrar} disabled={quitando} className={BOTON}>
            <span className="control-sheen" aria-hidden="true" />
            Volver
          </button>
          <button type="button" onClick={confirmar} disabled={quitando} className={PELIGRO}>
            {quitando
              ? "Quitando…"
              : todas
                ? "Quitar todas las próximas"
                : hayReservas
                  ? "Cancelar la clase"
                  : "Eliminar clase"}
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-sm text-verde-700">
        {clase.franjaId && (
          <Opciones
            nombre="quitar-alcance"
            leyenda="Esta clase se repite. ¿Cuáles quieres quitar?"
            valor={alcance}
            onCambio={setAlcance}
            opciones={[
              { valor: "esta", titulo: "Solo esta clase", detalle: diaLargo(clase.fecha) },
              { valor: "todas", titulo: "Todas las próximas", detalle: `${cada} a las ${clase.horaInicio}` },
            ]}
          />
        )}

        <p>
          {todas
            ? "Deja de repetirse. Las próximas que nadie reservó desaparecen; las que tienen reservas quedan «Canceladas» con su gente, para que sepas a quién avisar. Las que ya pasaron no se tocan."
            : hayReservas
              ? `${numero(clase.reservas)} ${clase.reservas === 1 ? "persona la tiene" : "personas la tienen"} reservada. La clase se queda en la agenda marcada «Cancelada», con sus reservas, para saber a quién avisar: hay que hacerlo una por una (ver «Reservas»), el sistema todavía no manda ningún mensaje.`
              : "Nadie la ha reservado, así que no afecta a nadie. Desaparece de la agenda."}
        </p>
      </div>
    </Modal>
  );
}
