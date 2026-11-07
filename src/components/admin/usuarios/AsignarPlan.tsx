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
import { aperturaPosible, precioDeVenta, type EstadoCampana } from "@/lib/admin/campana";

const METODOS: MetodoPago[] = ["Nequi", "Daviplata", "Transferencia", "Efectivo", "Tarjeta", "Otro"];

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
  /** La campaña de descuento por tramos que corre hoy, o `null`. */
  campana?: EstadoCampana | null;
  /** Si nunca ha tenido un plan: solo entonces entra en la campaña. */
  primeraMembresia?: boolean;
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
 *
 * ⚠️ **El plan se cobra SIEMPRE entero** (decisión del usuario, nov 2026). Se
 * quitaron «Una parte» y «Nada todavía» (paso 6) y la base ya no acepta
 * abonos. Las deudas que quedaran de antes se cobran en la ficha
 * («Registrar pago»).
 */
export default function AsignarPlan({
  clienteId,
  nombre,
  vencimiento,
  planes,
  hoy,
  campana = null,
  primeraMembresia = false,
}: Props) {
  const { mostrarAviso } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [planId, setPlanId] = useState("");
  const [metodo, setMetodo] = useState<MetodoPago>("Nequi");
  const [error, setError] = useState("");
  const [guardando, iniciar] = useTransition();

  const renovar = vencimiento !== "";
  const plan = planes.find((p) => p.id === planId);

  // Campaña de apertura: el % que le toca si es su primera membresía. Las
  // mismas reglas que `registrar_membresia`.
  const pctApertura = aperturaPosible(campana, primeraMembresia);

  // Mismo cálculo que la función de la base: el día después del vencimiento
  // actual, o hoy si ya venció o no tenía plan; y si la campaña fija el día
  // de inicio, ese.
  const despuesDelActual = vencimiento ? sumarDias(vencimiento, 1) : hoy;
  const inicioNormal = despuesDelActual > hoy ? despuesDelActual : hoy;
  const inicioCampana =
    pctApertura !== null && campana?.inicioMembresias && campana.inicioMembresias > inicioNormal
      ? campana.inicioMembresias
      : null;
  const inicio = inicioCampana ?? inicioNormal;
  const vence = plan ? sumarDias(inicio, plan.vigenciaDias) : "";

  // Lo que se cobra hoy: el plan entero, siempre.
  const precio = plan ? precioDeVenta(plan, pctApertura) : 0;

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
      const quien = nombre.split(" ")[0];
      // El aviso cuenta lo que cobró la base: si otra venta se llevó el
      // último cupo del tramo, el % (o el precio) pudo cambiar.
      const cobrado = r.importe ?? precio;
      const pctReal = r.aperturaPct ?? null;
      const cambio =
        pctApertura !== null && pctReal !== pctApertura
          ? " El tramo cambió mientras se cobraba."
          : "";
      mostrarAviso(
        `${plan.nombre} para ${quien}: cobrados ${moneda(cobrado)}${
          pctReal !== null ? ` con el ${pctReal} % de apertura` : ""
        }.${cambio}`,
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
              {/* Campaña de apertura: lo primero que se lee, porque cambia
                  el precio de todos los planes de la lista. */}
              {pctApertura !== null && campana?.tramo && (
                <div className="rounded-xl border border-dorado/60 bg-[color-mix(in_srgb,var(--color-dorado)_10%,white)] px-4 py-3 text-sm text-verde">
                  <p className="font-medium">
                    {campana.nombre} · membresía{" "}
                    <span className="font-cifra whitespace-nowrap">
                      {campana.vendidas + 1} de {campana.meta}
                    </span>
                  </p>
                  <p className="mt-0.5 text-verde-700">
                    <span className="font-cifra">−{pctApertura} %</span> en su primera membresía.{" "}
                    {campana.tramo.quedan === 1
                      ? "Es la última a este precio."
                      : `Quedan ${campana.tramo.quedan} a este precio.`}
                  </p>
                </div>
              )}

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
                          · {moneda(precioDeVenta(p, pctApertura))}
                          {pctApertura !== null
                            ? ` (apertura −${pctApertura} %)`
                            : p.descuento
                              ? ` (−${p.descuento.pct} %)`
                              : ""}
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
                      <dd className="font-cifra font-normal text-verde">{moneda(precio)}</dd>
                    </div>
                  </dl>
                )}
                {plan && pctApertura !== null && (
                  <p className="mt-2 text-xs text-dorado-tinta">
                    Con el {pctApertura} % de apertura: {moneda(precio)} en vez de{" "}
                    {moneda(plan.precioLista)}.
                  </p>
                )}
                {plan?.descuento && pctApertura === null && (
                  <p className="mt-2 text-xs text-dorado-tinta">
                    Con el descuento del {plan.descuento.pct} %: {moneda(plan.precio)} en vez de{" "}
                    {moneda(plan.precioLista)}.
                  </p>
                )}
                {plan && inicioCampana && (
                  <p className="mt-2 text-xs text-verde-300">
                    Las membresías de apertura empiezan el {fecha(inicioCampana, true)}.
                  </p>
                )}
                {plan && !inicioCampana && inicio > hoy && (
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
                    ? `Cobrar ${moneda(precio)}`
                    : "Cobrar"}
              </button>
            )}
          </div>
        </form>
      </Modal>
    </>
  );
}
