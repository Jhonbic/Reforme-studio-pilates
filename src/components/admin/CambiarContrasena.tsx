"use client";

import { useState, useTransition } from "react";
import Modal from "@/components/admin/Modal";
import CampoTexto from "@/components/admin/campos/CampoTexto";
import { useToast } from "@/context/ToastContext";
import { cambiarMiContrasena } from "@/lib/admin/acciones";

const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center justify-center gap-2 overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde";
const BOTON_PRIMARIO =
  "inline-flex min-h-[44px] items-center justify-center rounded-full bg-dorado px-5 text-sm font-medium text-verde-900 transition-colors duration-300 hover:bg-dorado-dark disabled:opacity-60";

/**
 * Cambiar la propia contraseña. Existe sobre todo para la contraseña temporal
 * que entrega Administración al dar acceso: la primera vez que se entra, se
 * cambia aquí.
 *
 * Pide la actual (ver `cambiarMiContrasena`) y la nueva DOS veces: un error al
 * teclear una contraseña que no se ve dejaría a la persona fuera.
 */
export default function CambiarContrasena({
  abierto,
  onCerrar,
}: {
  abierto: boolean;
  onCerrar: () => void;
}) {
  const { mostrarAviso } = useToast();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState("");
  const [guardando, iniciar] = useTransition();

  function cerrar() {
    setActual("");
    setNueva("");
    setRepetida("");
    setError("");
    onCerrar();
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (nueva.length < 8) return setError("La contraseña nueva necesita al menos 8 caracteres.");
    if (nueva !== repetida) return setError("Las dos contraseñas nuevas no coinciden.");
    setError("");
    iniciar(async () => {
      const r = await cambiarMiContrasena(actual, nueva);
      if (!r.ok) return setError(r.error);
      cerrar();
      mostrarAviso("Contraseña cambiada.", "success");
    });
  }

  return (
    <Modal abierto={abierto} onCerrar={cerrar} cerrable={!guardando} titulo="Cambiar contraseña" tamano="sm">
      <form onSubmit={enviar} noValidate className="space-y-4">
        <CampoTexto
          nombre="contrasena-actual"
          etiqueta="Contraseña actual"
          type="password"
          autoComplete="current-password"
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          ancho
        />
        <CampoTexto
          nombre="contrasena-nueva"
          etiqueta="Contraseña nueva"
          type="password"
          autoComplete="new-password"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          ayuda="Al menos 8 caracteres."
          ancho
        />
        <CampoTexto
          nombre="contrasena-repetida"
          etiqueta="Repite la nueva"
          type="password"
          autoComplete="new-password"
          value={repetida}
          onChange={(e) => setRepetida(e.target.value)}
          ancho
        />

        {error && (
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
          <button type="submit" disabled={guardando} className={BOTON_PRIMARIO}>
            {guardando ? "Cambiando…" : "Cambiar contraseña"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
