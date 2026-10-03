"use client";

import { useState, useTransition } from "react";
import Modal from "@/components/admin/Modal";
import { accesoWebCliente } from "@/lib/admin/acciones";

const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde disabled:opacity-60";
const BOTON_PRIMARIO =
  "inline-flex min-h-[44px] items-center justify-center rounded-full bg-dorado px-5 text-sm font-medium text-verde-900 transition-colors duration-300 hover:bg-dorado-dark disabled:opacity-60";

/**
 * «Acceso a la web» desde la ficha de un cliente: para que un cliente que dio
 * de alta recepción pueda entrar a `/mi-cuenta` y reservar solo.
 *
 * Mismo patrón que dar acceso a alguien del equipo (`GestionMiembro`): una
 * contraseña temporal que se enseña UNA vez y no se cierra hasta pulsar
 * «Hecho». Si ya tiene acceso, el botón genera otra (la olvidó).
 */
export default function AccesoWebCliente({
  clienteId,
  nombre,
  correo,
  tieneAcceso,
}: {
  clienteId: string;
  nombre: string;
  correo: string;
  tieneAcceso: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [copiada, setCopiada] = useState(false);
  const [enCurso, iniciar] = useTransition();

  function cerrar() {
    setAbierto(false);
    setContrasena("");
    setError("");
    setCopiada(false);
  }

  function generar() {
    setError("");
    iniciar(async () => {
      const r = await accesoWebCliente(clienteId);
      if (!r.ok) return setError(r.error);
      setContrasena(r.contrasena ?? "");
    });
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(contrasena);
      setCopiada(true);
    } catch {
      // Sin portapapeles queda a la vista y seleccionable.
    }
  }

  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className={BOTON}>
        <span className="control-sheen" aria-hidden="true" />
        {tieneAcceso ? "Acceso web ✓" : "Dar acceso web"}
      </button>

      <Modal abierto={abierto} onCerrar={cerrar} cerrable={!enCurso} titulo={`Acceso a la web · ${nombre}`} tamano="md">
        {contrasena ? (
          <div className="space-y-4">
            <p className="text-sm text-verde-700">
              {nombre.split(" ")[0]} entra en <strong>/login</strong> con su correo{" "}
              <strong>{correo}</strong> y esta contraseña, y la cambia cuando
              quiera.
            </p>
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dorado/50 bg-dorado/10 px-4 py-3">
              <code className="select-all font-cifra text-xl font-normal tracking-wider text-verde">{contrasena}</code>
              <button type="button" onClick={copiar} className={BOTON}>
                <span className="control-sheen" aria-hidden="true" />
                {copiada ? "Copiada ✓" : "Copiar"}
              </button>
            </div>
            <p className="text-xs text-verde-300">
              ⚠️ No se volverá a enseñar: entrégasela ahora (en persona o por
              WhatsApp). Si se pierde, genera otra.
            </p>
            <div className="flex justify-end">
              <button type="button" onClick={cerrar} className={BOTON_PRIMARIO}>
                Hecho
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-verde-700">
              {tieneAcceso
                ? "Ya puede entrar a la web. Si olvidó su contraseña, genera una temporal nueva: la anterior dejará de servir."
                : "Con acceso a la web puede ver su plan y sus clases, y reservar o cancelar solo. Su usuario será el correo de su ficha."}
            </p>
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-[color-mix(in_srgb,var(--color-estado-grave)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-estado-grave)_8%,transparent)] px-4 py-3 text-sm text-[var(--color-estado-grave)]"
              >
                {error}
              </p>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={cerrar} className={BOTON}>
                <span className="control-sheen" aria-hidden="true" />
                Volver
              </button>
              <button type="button" onClick={generar} disabled={enCurso} className={BOTON_PRIMARIO}>
                {enCurso ? "Generando…" : tieneAcceso ? "Nueva contraseña temporal" : "Dar acceso"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
