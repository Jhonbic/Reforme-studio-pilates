"use client";

import { useState, useTransition } from "react";
import Modal from "@/components/admin/Modal";
import CampoSelect from "@/components/admin/campos/CampoSelect";
import CampoTexto from "@/components/admin/campos/CampoTexto";
import { useToast } from "@/context/ToastContext";
import { asignarPlan } from "@/lib/admin/acciones";
import { fecha, moneda } from "@/lib/admin/format";
import { soloDigitos } from "@/lib/validacion";
import { sumarDias } from "@/lib/admin/horario";
import type { PlanALaVenta } from "@/lib/admin/queries";
import type { MetodoPago } from "@/lib/admin/types";

const METODOS: MetodoPago[] = ["Nequi", "Daviplata", "Transferencia", "Efectivo", "Tarjeta", "Otro"];

/** Cuánto paga hoy: el plan entero, un abono o nada (queda debiendo). */
type ModoPago = "todo" | "parte" | "nada";
const MODOS: { valor: ModoPago; texto: string }[] = [
  { valor: "todo", texto: "Todo" },
  { valor: "parte", texto: "Una parte" },
  { valor: "nada", texto: "Nada todavía" },
];

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
  const [modo, setModo] = useState<ModoPago>("todo");
  const [parte, setParte] = useState("");
  const [error, setError] = useState("");
  const [guardando, iniciar] = useTransition();

  const renovar = vencimiento !== "";
  const plan = planes.find((p) => p.id === planId);

  // Mismo cálculo que la función de la base: el día después del vencimiento
  // actual, o hoy si ya venció o no tenía plan.
  const despuesDelActual = vencimiento ? sumarDias(vencimiento, 1) : hoy;
  const inicio = despuesDelActual > hoy ? despuesDelActual : hoy;
  const vence = plan ? sumarDias(inicio, plan.vigenciaDias) : "";

  // Lo que entra hoy y lo que queda debiendo. Con «Una parte» vacía, 0.
  const precio = plan?.precio ?? 0;
  const pagaHoy = modo === "todo" ? precio : modo === "nada" ? 0 : Number(parte || 0);
  const debe = Math.max(0, precio - pagaHoy);
  const errorParte =
    modo !== "parte" || !plan || parte === ""
      ? ""
      : pagaHoy <= 0
        ? "Escribe cuánto paga hoy."
        : pagaHoy >= precio
          ? `Es el plan entero: elige «Todo» (${moneda(precio)}).`
          : "";

  function cerrar() {
    setAbierto(false);
    setPlanId("");
    setMetodo("Nequi");
    setModo("todo");
    setParte("");
    setError("");
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!plan) return setError("Elige un plan.");
    if (modo === "parte" && (parte === "" || errorParte))
      return setError(errorParte || "Escribe cuánto paga hoy.");
    setError("");
    iniciar(async () => {
      const r = await asignarPlan(clienteId, plan.id, metodo, modo === "todo" ? null : pagaHoy);
      if (!r.ok) return setError(r.error);
      cerrar();
      const quien = nombre.split(" ")[0];
      mostrarAviso(
        debe === 0
          ? `${plan.nombre} para ${quien}: cobrados ${moneda(plan.precio)}.`
          : pagaHoy === 0
            ? `${plan.nombre} para ${quien}: queda debiendo ${moneda(debe)}.`
            : `${plan.nombre} para ${quien}: cobrados ${moneda(pagaHoy)}, queda debiendo ${moneda(debe)}.`,
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

              {/* Pagar a plazos: el plan se activa igual, y lo que falta sale
                  en la ficha y en «Por cobrar» del dashboard hasta que se
                  cobre. */}
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium text-verde">Paga hoy</legend>
                <div className="flex flex-wrap gap-2">
                  {MODOS.map((m) => (
                    <label
                      key={m.valor}
                      className={`inline-flex min-h-[44px] cursor-pointer items-center rounded-full border px-4 text-sm transition-colors duration-300 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-dorado/40 ${
                        modo === m.valor
                          ? "border-dorado bg-dorado text-verde-900"
                          : "border-beige text-verde-700 hover:border-dorado"
                      }`}
                    >
                      <input
                        type="radio"
                        name="modo-pago"
                        value={m.valor}
                        checked={modo === m.valor}
                        onChange={() => {
                          setModo(m.valor);
                          setError("");
                        }}
                        className="sr-only"
                      />
                      {m.texto}
                    </label>
                  ))}
                </div>
              </fieldset>

              {modo === "parte" && (
                <CampoTexto
                  nombre="abono"
                  etiqueta="Cuánto paga hoy"
                  inputMode="numeric"
                  autoComplete="off"
                  value={parte}
                  onChange={(e) => {
                    setParte(soloDigitos(e.target.value).slice(0, 9));
                    setError("");
                  }}
                  error={errorParte || undefined}
                  ayuda={
                    parte && !errorParte
                      ? `${moneda(pagaHoy)} · queda debiendo ${moneda(debe)}`
                      : "En pesos, sin puntos."
                  }
                  ancho
                />
              )}

              {modo !== "nada" && (
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
              )}

              {/* El resumen solo aparece con un plan elegido: antes no hay
                  fechas ni importe que anunciar. `aria-live` para que quien usa
                  lector oiga el cambio al elegir otro plan. */}
              <div aria-live="polite">
                {plan && (
                  <dl className="grid grid-cols-2 gap-3 rounded-xl border border-beige bg-arena/50 px-4 py-3 text-sm sm:grid-cols-4">
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
                      <dd className="font-cifra font-normal text-verde">{moneda(pagaHoy)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-verde-300">Queda debiendo</dt>
                      <dd
                        className={`font-cifra font-normal ${debe > 0 ? "text-[var(--color-estado-aviso)]" : "text-verde"}`}
                      >
                        {debe > 0 ? moneda(debe) : "Nada"}
                      </dd>
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

          {/* El error del abono ya sale bajo su campo: no se repite aquí. */}
          {error && plan && error !== errorParte && (
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
                  : !plan
                    ? "Cobrar"
                    : pagaHoy > 0
                      ? `Cobrar ${moneda(pagaHoy)}`
                      : "Asignar sin cobrar"}
              </button>
            )}
          </div>
        </form>
      </Modal>
    </>
  );
}
