"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { cambiarVentaPlan, eliminarPlan } from "@/lib/admin/acciones";
import { useToast } from "@/context/ToastContext";
import { moneda, numero } from "@/lib/admin/format";
import type { ModalidadPlan, PlanConMetricas } from "@/lib/admin/types";
import FormularioPlan from "./FormularioPlan";
import TarjetaPlan from "./TarjetaPlan";

const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center gap-2 overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde";

/**
 * Catálogo de planes con sus tres acciones.
 *
 * Las tres guardan en Supabase desde oct 2026 (`lib/admin/acciones.ts`).
 *
 * ⚠️ **Un plan con clientes no se borra: se retira de la venta.** La base no
 * deja borrar un plan que alguien haya contratado (el historial de pagos lo
 * necesita), así que con clientes el diálogo no ofrece «Eliminar», sino la
 * acción que sí sirve: «Marcar como no se vende».
 */
const MODALIDADES: ModalidadPlan[] = ["Mat", "Reformer", "Fusión"];

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

  const conClientes = (borrando?.clientes ?? 0) > 0;

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
          {planes.length === 1 ? "plan" : "planes"} ·{" "}
          {numero(planes.filter((p) => p.seVende).length)} a la venta
        </p>

        <button type="button" onClick={abrirAlta} className={BOTON}>
          <span className="control-sheen" aria-hidden="true" />
          <span aria-hidden="true">+</span>
          Nuevo plan
        </button>
      </div>

      {/* Agrupados por modalidad, como los presenta el estudio (Mat, Reformer,
          Fusión), y dentro de cada una del más barato al más caro. Cuatro
          columnas solo en `xl`: en `lg` la barra lateral deja ~700px al
          contenido y cuatro tarjetas de precio ahí serían ilegibles. */}
      {MODALIDADES.map((m) => {
        const deEsta = planes.filter((p) => p.modalidad === m);
        if (deEsta.length === 0) return null;
        return (
          <section key={m} aria-labelledby={`modalidad-${m}`} className="mt-8 first-of-type:mt-4">
            {/* Encabezado del grupo: qué es, cuántos planes y desde cuánto. */}
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-beige pb-2">
              <h2 id={`modalidad-${m}`} className="font-display text-2xl text-verde">
                {m === "Fusión" ? "Fusión" : m}
              </h2>
              <p className="text-sm text-verde-300">
                {m === "Fusión" ? "Reformer y Mat · " : ""}
                {deEsta.length} {deEsta.length === 1 ? "plan" : "planes"} · desde{" "}
                {moneda(Math.min(...deEsta.map((p) => p.precio)))}
              </p>
            </div>
            {/* Tres columnas: cada modalidad trae tres planes (4, 8 y 12), así
                que cada fila es una modalidad completa sin huecos. Con cuatro
                columnas quedaba una vacía a la derecha en todas las filas. */}
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:gap-5">
              {deEsta.map((p) => (
                <li key={p.id} className="flex">
                  <TarjetaPlan
                    plan={p}
                    destacado={p.id === masContratado?.id}
                    onEditar={() => abrirEdicion(p)}
                    onEliminar={() => setBorrando(p)}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <FormularioPlan
        abierto={formAbierto}
        plan={editando}
        onCerrar={() => setFormAbierto(false)}
        onGuardado={(nombre, esNuevo) =>
          mostrarAviso(
            esNuevo
              ? `Plan «${nombre}» creado.`
              : `Cambios de «${nombre}» guardados.`,
            "success",
          )
        }
      />

      {/* Dos diálogos en uno, según si el plan tiene clientes. Con clientes,
          borrar es imposible (la base lo impide), así que se ofrece lo que sí
          se puede hacer en vez de un botón que acabaría en error. */}
      <ConfirmDialog
        abierto={borrando !== null}
        titulo={
          conClientes
            ? `${borrando?.nombreVisible} tiene clientes`
            : `¿Eliminar ${borrando?.nombreVisible}?`
        }
        mensaje={
          conClientes && borrando
            ? `${numero(borrando.clientes)} ${
                borrando.clientes === 1 ? "cliente lo tiene" : "clientes lo tienen"
              } contratado, y un plan que alguien ha pagado no se puede borrar: su historial lo necesita. Lo que sí se puede es dejar de venderlo: quien lo tiene lo conserva hasta que le venza.`
            : "Ningún cliente lo tiene ahora. Si alguien lo contrató en el pasado, la base no dejará borrarlo y te propondrá retirarlo de la venta. Esta acción no se puede deshacer."
        }
        textoConfirmar={conClientes ? "Marcar como no se vende" : "Eliminar plan"}
        variante={conClientes ? "normal" : "peligro"}
        onConfirmar={async () => {
          if (!borrando) return;
          const { id, nombreVisible } = borrando;
          const r = conClientes
            ? await cambiarVentaPlan(id, false)
            : await eliminarPlan(id);
          setBorrando(null);
          mostrarAviso(
            r.ok
              ? conClientes
                ? `«${nombreVisible}» ya no se vende. Quien lo tiene lo conserva.`
                : `Plan «${nombreVisible}» eliminado.`
              : r.error,
            r.ok ? "success" : "warning",
          );
        }}
        onCancelar={() => setBorrando(null)}
      />
    </>
  );
}
