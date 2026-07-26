"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/context/ToastContext";
import { numero } from "@/lib/admin/format";
import type { PlanConMetricas } from "@/lib/admin/types";
import FormularioPlan from "./FormularioPlan";
import TarjetaPlan from "./TarjetaPlan";

const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center gap-2 overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde";

/**
 * Catálogo de planes con sus tres acciones.
 *
 * ⚠️ **Ninguna de las tres guarda**, y las tres lo dicen. El catálogo vive en
 * `mock.ts` como constante de módulo: mutarlo desde aquí se perdería en el
 * siguiente render del servidor y —lo peor— *parecería* que funciona. Es el
 * mismo motivo por el que el alta de cliente descartó `sessionStorage`.
 *
 * Lo que sí es real es la pantalla: qué campos define un plan, qué avisa antes
 * de borrar y cómo se compara una modalidad con otra.
 */
export default function PanelPlanes({ planes }: { planes: PlanConMetricas[] }) {
  const { mostrarAviso } = useToast();
  const [formAbierto, setFormAbierto] = useState(false);
  /* `undefined` = alta. El plan concreto = edición. */
  const [editando, setEditando] = useState<PlanConMetricas | undefined>();
  const [borrando, setBorrando] = useState<PlanConMetricas | null>(null);

  /* El más contratado se DERIVA, no se marca a dedo: en un panel interno lo
     útil es ver cuál se vende de verdad, no cuál querríamos destacar. Con el
     catálogo vacío no hay ninguno, y con empate gana el primero — da igual,
     porque la etiqueta es informativa y el número está al lado. */
  const masContratado = planes.reduce<PlanConMetricas | null>(
    (mejor, p) => (mejor === null || p.clientes > mejor.clientes ? p : mejor),
    null,
  );

  function abrirAlta() {
    setEditando(undefined);
    setFormAbierto(true);
  }

  function abrirEdicion(p: PlanConMetricas) {
    setEditando(p);
    setFormAbierto(true);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-verde-300">
          {numero(planes.length)}{" "}
          {planes.length === 1 ? "modalidad" : "modalidades"} ·{" "}
          {numero(planes.filter((p) => p.seVende).length)} a la venta
        </p>

        <button type="button" onClick={abrirAlta} className={BOTON}>
          <span className="control-sheen" aria-hidden="true" />
          <span aria-hidden="true">+</span>
          Nuevo plan
        </button>
      </div>

      {/* Cuatro columnas solo en `xl`: en `lg` la barra lateral deja ~700px al
          contenido y cuatro tarjetas de precio ahí serían ilegibles. */}
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
        {planes.map((p) => (
          <li key={p.plan} className="flex">
            <TarjetaPlan
              plan={p}
              destacado={p.plan === masContratado?.plan}
              onEditar={() => abrirEdicion(p)}
              onEliminar={() => setBorrando(p)}
            />
          </li>
        ))}
      </ul>

      <FormularioPlan
        abierto={formAbierto}
        plan={editando}
        onCerrar={() => setFormAbierto(false)}
        onGuardado={(nombre, esNuevo) =>
          mostrarAviso(
            esNuevo
              ? `El plan «${nombre}» NO se ha creado: el catálogo todavía vive en el código. Llegará con la base de datos.`
              : `Los cambios de «${nombre}» NO se han guardado: el catálogo todavía vive en el código.`,
            "warning",
          )
        }
      />

      <ConfirmDialog
        abierto={borrando !== null}
        titulo={`¿Eliminar ${borrando?.nombreVisible}?`}
        /* ⚠️ El aviso lleva el número de clientes afectados, y no es adorno:
           borrar un plan con 32 personas dentro es una decisión distinta a
           borrar uno vacío, y ese dato solo lo tiene esta pantalla. */
        mensaje={
          borrando && borrando.clientes > 0
            ? `${numero(borrando.clientes)} ${
                borrando.clientes === 1 ? "cliente lo tiene" : "clientes lo tienen"
              } contratado ahora mismo. Si lo eliminas, su membresía se queda sin modalidad y habrá que reasignarla a mano. Considera marcarlo como «no se vende» en vez de borrarlo: deja de ofrecerse y quien lo tiene lo conserva.`
            : "Ningún cliente lo tiene contratado, así que no afecta a nadie. Esta acción no se puede deshacer."
        }
        textoConfirmar="Eliminar plan"
        variante="peligro"
        onConfirmar={() => {
          const nombre = borrando?.nombreVisible ?? "";
          setBorrando(null);
          mostrarAviso(
            `El plan «${nombre}» NO se ha eliminado: el catálogo todavía vive en el código.`,
            "warning",
          );
        }}
        onCancelar={() => setBorrando(null)}
      />
    </>
  );
}
