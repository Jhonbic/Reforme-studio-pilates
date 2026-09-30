"use client";

import { useState } from "react";
import { crearPlan, actualizarPlan, eliminarPlan } from "@/app/admin/planes/acciones";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/context/ToastContext";
import { numero } from "@/lib/admin/format";
import type { BorradorPlan, PlanConMetricas } from "@/lib/admin/types";
import FormularioPlan from "./FormularioPlan";
import TarjetaPlan from "./TarjetaPlan";

const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center gap-2 overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde";

/**
 * Catálogo de planes con sus tres acciones.
 *
 * ⚠️ **Las tres GUARDAN de verdad**, contra la tabla `planes` a través de las
 * server actions. Fue la primera pantalla del panel en dejar de ser una
 * maqueta; el resto sigue leyendo `mock.ts`.
 *
 * No hace falta tocar el estado local tras guardar: cada acción llama a
 * `revalidatePath`, así que la página de servidor se vuelve a renderizar y
 * `planes` baja ya actualizado. Mantener aquí una copia sería tener dos
 * verdades.
 */
export default function PanelPlanes({ planes }: { planes: PlanConMetricas[] }) {
  const { mostrarAviso } = useToast();
  const [formAbierto, setFormAbierto] = useState(false);
  /* `undefined` = alta. El plan concreto = edición. */
  const [editando, setEditando] = useState<PlanConMetricas | undefined>();
  const [borrando, setBorrando] = useState<PlanConMetricas | null>(null);
  const [eliminando, setEliminando] = useState(false);

  function abrirAlta() {
    setEditando(undefined);
    setFormAbierto(true);
  }

  function abrirEdicion(p: PlanConMetricas) {
    setEditando(p);
    setFormAbierto(true);
  }

  /* El formulario no sabe si es alta o edición: eso se decide aquí, que es
     donde se sabe qué plan se abrió. Devuelve el resultado tal cual para que el
     diálogo pueda quedarse abierto y pintar el error sin perder lo escrito. */
  async function guardar(borrador: BorradorPlan) {
    const resultado = editando
      ? await actualizarPlan(editando.id, borrador)
      : await crearPlan(borrador);

    if (resultado.ok) {
      mostrarAviso(
        editando
          ? `Se guardaron los cambios de «${borrador.nombre}».`
          : `Se creó el plan «${borrador.nombre}».`,
        "success",
      );
    }

    return resultado;
  }

  async function confirmarEliminar() {
    if (!borrando) return;

    setEliminando(true);
    const resultado = await eliminarPlan(borrando.id);
    setEliminando(false);

    if (resultado.ok) {
      mostrarAviso(`Se eliminó el plan «${borrando.nombre}».`, "success");
      setBorrando(null);
      return;
    }

    /* ⚠️ El diálogo se cierra igual cuando la base lo rechaza, y el motivo va
       al aviso: el caso típico es «tiene clientes contratados», que no se
       arregla insistiendo en el mismo botón sino marcándolo «no se vende». */
    setBorrando(null);
    mostrarAviso(resultado.mensaje, "warning");
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

      {planes.length === 0 ? (
        /* El catálogo arranca vacío a propósito: el estudio crea sus propias
           modalidades. Sin este bloque, la pantalla sería una franja con un
           botón y parecería que algo falló al cargar. */
        <div className="mt-4 rounded-2xl border border-dashed border-beige bg-white/50 px-6 py-12 text-center">
          <p className="font-display text-2xl text-verde">
            Todavía no hay planes
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-verde-700">
            Crea las modalidades que ofrece el estudio: cuánto cuestan, cuánto
            duran y qué incluyen. Son las que luego se les asignan a los
            clientes.
          </p>
          <button
            type="button"
            onClick={abrirAlta}
            className={`${BOTON} mt-6 justify-center`}
          >
            <span className="control-sheen" aria-hidden="true" />
            <span aria-hidden="true">+</span>
            Crear el primero
          </button>
        </div>
      ) : (
        /* Cuatro columnas solo en `xl`: en `lg` la barra lateral deja ~700px al
           contenido y cuatro tarjetas de precio ahí serían ilegibles. */
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
          {planes.map((p) => (
            <li key={p.id} className="flex">
              <TarjetaPlan
                plan={p}
                destacado={p.destacado}
                onEditar={() => abrirEdicion(p)}
                onEliminar={() => setBorrando(p)}
              />
            </li>
          ))}
        </ul>
      )}

      <FormularioPlan
        abierto={formAbierto}
        plan={editando}
        onCerrar={() => setFormAbierto(false)}
        onGuardar={guardar}
      />

      <ConfirmDialog
        abierto={borrando !== null}
        titulo={`¿Eliminar ${borrando?.nombre}?`}
        /* ⚠️ El aviso lleva el número de clientes afectados, y no es adorno:
           borrar un plan con 32 personas dentro es una decisión distinta a
           borrar uno vacío.

           ⚠️ Hoy `clientes` es siempre 0 porque las membresías siguen en
           `mock.ts`, así que en la práctica solo se ve la segunda rama — y por
           eso NO afirma «no afecta a nadie», que sería prometer algo que esta
           pantalla todavía no puede comprobar. Quien lo impide de verdad es el
           `on delete restrict` de la base. La primera rama se queda escrita
           para cuando el recuento sea real. */
        mensaje={
          borrando && borrando.clientes > 0
            ? `${numero(borrando.clientes)} ${
                borrando.clientes === 1
                  ? "cliente lo tiene"
                  : "clientes lo tienen"
              } contratado ahora mismo. Considera marcarlo como «no se vende» en vez de borrarlo: deja de ofrecerse y quien lo tiene lo conserva.`
            : "Esta acción no se puede deshacer. Si algún cliente lo tiene contratado, la base de datos impedirá el borrado y te lo dirá."
        }
        textoConfirmar={eliminando ? "Eliminando…" : "Eliminar plan"}
        variante="peligro"
        onConfirmar={confirmarEliminar}
        onCancelar={() => setBorrando(null)}
      />
    </>
  );
}
