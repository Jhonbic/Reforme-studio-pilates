"use client";

import { useState, useTransition } from "react";
import Modal from "@/components/admin/Modal";
import CampoSelect from "@/components/admin/campos/CampoSelect";
import CampoTexto from "@/components/admin/campos/CampoTexto";
import { useToast } from "@/context/ToastContext";
import { registrarPago } from "@/lib/admin/acciones";
import { METODOS_PAGO } from "@/lib/admin/catalogos";
import { fecha, moneda } from "@/lib/admin/format";
import type { MetodoPago, PagoPendiente } from "@/lib/admin/types";
import { soloDigitos } from "@/lib/validacion";

const BOTON_PRIMARIO =
  "inline-flex min-h-[44px] items-center justify-center rounded-full bg-dorado px-5 text-sm font-medium text-verde-900 transition-colors duration-300 hover:bg-dorado-dark disabled:opacity-60";
const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center justify-center gap-2 overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde";

/**
 * Lo que un cliente debe de una membresía, con «Registrar pago».
 *
 * Aparece en la ficha cuando el plan se asignó con un abono o sin cobrar. El
 * importe arranca en TODO lo que falta (lo normal es saldar), y se puede
 * bajar para otro abono. La base no deja pasar de lo que se debe.
 */
export default function CobrarPendiente({ deuda }: { deuda: PagoPendiente }) {
  const { mostrarAviso } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [importe, setImporte] = useState(String(deuda.pendiente));
  const [metodo, setMetodo] = useState<MetodoPago>("Nequi");
  const [error, setError] = useState("");
  const [guardando, iniciar] = useTransition();

  const valor = Number(importe || 0);
  const errorImporte =
    importe === "" || valor <= 0
      ? "Escribe cuánto paga."
      : valor > deuda.pendiente
        ? `Solo falta por cobrar ${moneda(deuda.pendiente)}.`
        : "";
  const queda = deuda.pendiente - valor;

  function abrir() {
    setImporte(String(deuda.pendiente));
    setMetodo("Nequi");
    setError("");
    setAbierto(true);
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (errorImporte) return setError(errorImporte);
    setError("");
    iniciar(async () => {
      const r = await registrarPago(deuda.membresiaId, valor, metodo);
      if (!r.ok) return setError(r.error);
      setAbierto(false);
      mostrarAviso(
        queda > 0
          ? `Cobrados ${moneda(valor)}. Queda debiendo ${moneda(queda)}.`
          : `Cobrados ${moneda(valor)}. ${deuda.plan} queda pagado.`,
        "success",
      );
    });
  }

  return (
    <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-estado-aviso)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-estado-aviso)_8%,transparent)] px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-verde">
            <span aria-hidden="true" className="text-[var(--color-estado-aviso)]">
              ▲{" "}
            </span>
            Debe <span className="font-cifra">{moneda(deuda.pendiente)}</span>
          </p>
          <p className="text-xs text-verde-700">
            {deuda.plan} · pagó <span className="font-cifra">{moneda(deuda.pagado)}</span> de{" "}
            <span className="font-cifra">{moneda(deuda.importe)}</span> · vence{" "}
            {fecha(deuda.vencimiento, true)}
          </p>
        </div>
        <button type="button" onClick={abrir} className={BOTON_PRIMARIO}>
          Registrar pago
        </button>
      </div>

      <Modal
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        cerrable={!guardando}
        titulo={`Registrar pago · ${deuda.nombre}`}
        tamano="md"
      >
        <form onSubmit={enviar} noValidate className="space-y-4">
          <p className="text-sm text-verde-700">
            {deuda.plan}: debe <span className="font-cifra">{moneda(deuda.pendiente)}</span> de{" "}
            <span className="font-cifra">{moneda(deuda.importe)}</span>.
          </p>
          <CampoTexto
            nombre="importe-pago"
            etiqueta="Cuánto paga"
            inputMode="numeric"
            autoComplete="off"
            value={importe}
            onChange={(e) => {
              setImporte(soloDigitos(e.target.value).slice(0, 9));
              setError("");
            }}
            error={importe !== "" && errorImporte ? errorImporte : undefined}
            ayuda={
              errorImporte
                ? "En pesos, sin puntos."
                : queda > 0
                  ? `${moneda(valor)} · seguirá debiendo ${moneda(queda)}`
                  : `${moneda(valor)} · queda pagado`
            }
            ancho
          />
          <CampoSelect
            nombre="metodo-pago"
            etiqueta="Cómo paga"
            value={metodo}
            onChange={(e) => setMetodo(e.target.value as MetodoPago)}
            ancho
          >
            {METODOS_PAGO.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </CampoSelect>

          {error && error !== errorImporte && (
            <p role="alert" className="text-sm text-[var(--color-estado-grave)]">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setAbierto(false)} className={BOTON}>
              <span className="control-sheen" aria-hidden="true" />
              Volver
            </button>
            <button type="submit" disabled={guardando} className={BOTON_PRIMARIO}>
              {guardando ? "Registrando…" : errorImporte ? "Cobrar" : `Cobrar ${moneda(valor)}`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
