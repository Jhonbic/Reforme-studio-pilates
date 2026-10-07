"use client";

import { useState, useTransition } from "react";
import Modal from "@/components/admin/Modal";
import CampoSelect from "@/components/admin/campos/CampoSelect";
import { useToast } from "@/context/ToastContext";
import { asignarPlan } from "@/lib/admin/acciones";
import { fecha, moneda } from "@/lib/admin/format";
import { sumarDias } from "@/lib/admin/horario";
import type { PlanALaVenta } from "@/lib/admin/queries";
import type { MetodoPago } from "@/lib/admin/types";

const METODOS: MetodoPago[] = ["Nequi", "Transferencia", "Efectivo", "Tarjeta"];

const BOTON_PRIMARIO =
  "inline-flex min-h-[44px] items-center justify-center rounded-full bg-dorado px-5 text-sm font-medium text-verde-900 transition-colors duration-300 hover:bg-dorado-dark disabled:opacity-60";

const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center justify-center gap-2 overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde";

type Props = {
  clienteId: string;
  nombre: string;
  /** Vencimiento de su última membresía, o cadena vacía si no tiene. */
  vencimiento: string;
  planes: PlanALaVenta[];
  /** Hoy en Bogotá, del servidor. */
  hoy: string;
};

/**
 * Asignar un plan a un cliente y cobrarlo. Sirve igual para el primer plan
 * («Asignar plan») que para renovar («Renovar»): es la misma operación.
 *
 * ⚠️ **Antes de cobrar se dice qué va a pasar**: desde cuándo, hasta cuándo y
 * cuánto. Es la misma regla que aplica la base (`registrar_membresia`):
 * renovar antes de que venza NO pisa los días ya pagados, empieza el día
 * después. Calcularlo aquí también es lo que permite enseñarlo; si las dos
 * reglas divergieran, el cobro diría una fecha y la ficha otra — por eso la
 * fuente de verdad sigue siendo la base, y esto es solo el anuncio.
 */
export default function AsignarPlan({ clienteId, nombre, vencimiento, planes, hoy }: Props) {
  const { mostrarAviso } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [planId, setPlanId] = useState("");
  const [metodo, setMetodo] = useState<MetodoPago>("Nequi");
  const [error, setError] = useState("");
  const [guardando, iniciar] = useTransition();

  const renovar = vencimiento !== "";
  const plan = planes.find((p) => p.id === planId);

  // Mismo cálculo que la función de la base: el día después del vencimiento
  // actual, o hoy si ya venció o no tenía plan.
  const despuesDelActual = vencimiento ? sumarDias(vencimiento, 1) : hoy;
  const inicio = despuesDelActual > hoy ? despuesDelActual : hoy;
  const vence = plan ? sumarDias(inicio, plan.vigenciaDias) : "";

  function cerrar() {
    setAbierto(false);
    setPlanId("");
    setMetodo("Nequi");
    setError("");
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!plan) return setError("Elige un plan.");
    setError("");
    iniciar(async () => {
      const r = await asignarPlan(clienteId, plan.id, metodo);
      if (!r.ok) return setError(r.error);
      cerrar();
      mostrarAviso(
        `${plan.nombre} para ${nombre.split(" ")[0]}: cobrados ${moneda(plan.precio)}.`,
        "success",
      );
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={BOTON_PRIMARIO}
      >
        {renovar ? "Renovar" : "Asignar plan"}
      </button>

      <Modal
        abierto={abierto}
        onCerrar={cerrar}
        titulo={renovar ? `Renovar a ${nombre}` : `Asignar plan a ${nombre}`}
        tamano="md"
      >
        <form onSubmit={enviar} noValidate className="space-y-4">
          {planes.length === 0 ? (
            <p className="text-sm text-verde-700">
              No hay ningún plan a la venta. Crea uno o vuelve a poner uno a la
              venta desde Planes.
            </p>
          ) : (
            <>
              <CampoSelect
                nombre="plan"
                etiqueta="Plan"
                value={planId}
                onChange={(e) => {
                  setPlanId(e.target.value);
                  setError("");
                }}
                error={error && !plan ? error : undefined}
                ancho
              >
                <option value="">Elige un plan…</option>
                {/* Por modalidad, como los presenta el estudio, y con lo que
                    trae cada uno: el nombre solo («Origen») no dice si es Mat. */}
                {(["Mat", "Reformer", "Fusión"] as const).map((m) => {
                  const deEsta = planes.filter((p) => p.modalidad === m);
                  return deEsta.length === 0 ? null : (
                    <optgroup key={m} label={m}>
                      {deEsta.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} ·{" "}
                          {p.modalidad === "Fusión"
                            ? `${p.clasesReformer} Reformer + ${p.clasesMat} Mat`
                            : `${p.clasesReformer + p.clasesMat} clases`}{" "}
                          · {moneda(p.precio)}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </CampoSelect>

              <CampoSelect
                nombre="metodo"
                etiqueta="Cómo paga"
                value={metodo}
                onChange={(e) => setMetodo(e.target.value as MetodoPago)}
                ancho
              >
                {METODOS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </CampoSelect>

              {/* El resumen solo aparece con un plan elegido: antes no hay
                  fechas ni importe que anunciar. `aria-live` para que quien usa
                  lector oiga el cambio al elegir otro plan. */}
              <div aria-live="polite">
                {plan && (
                  <dl className="grid grid-cols-3 gap-3 rounded-xl border border-beige bg-arena/50 px-4 py-3 text-sm">
                    <div>
                      <dt className="text-xs text-verde-300">Empieza</dt>
                      <dd className="font-cifra font-normal text-verde">{fecha(inicio, true)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-verde-300">Vence</dt>
                      <dd className="font-cifra font-normal text-verde">{fecha(vence, true)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-verde-300">Se cobra hoy</dt>
                      <dd className="font-cifra font-normal text-verde">{moneda(plan.precio)}</dd>
                    </div>
                  </dl>
                )}
                {plan && inicio > hoy && (
                  <p className="mt-2 text-xs text-verde-300">
                    Empieza cuando acabe el plan actual: los días que ya pagó no
                    se pierden.
                  </p>
                )}
              </div>
            </>
          )}

          {error && plan && (
            <p
              role="alert"
              className="rounded-xl border border-[color-mix(in_srgb,var(--color-estado-grave)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-estado-grave)_8%,transparent)] px-4 py-3 text-sm text-[var(--color-estado-grave)]"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <button type="button" onClick={cerrar} className={BOTON}>
              <span className="control-sheen" aria-hidden="true" />
              Cancelar
            </button>
            {planes.length > 0 && (
              <button type="submit" disabled={guardando} className={BOTON_PRIMARIO}>
                {guardando
                  ? "Registrando…"
                  : plan
                    ? `Cobrar ${moneda(plan.precio)}`
                    : "Cobrar"}
              </button>
            )}
          </div>
        </form>
      </Modal>
    </>
  );
}
