"use client";

import type { ReactNode } from "react";
import { CASILLA, ERROR, FILA_CHECK, idsDeCampo } from "./estilos";

type Props = {
  nombre: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
  children: ReactNode;
  ancho?: boolean;
};

/**
 * Casilla de verificación.
 *
 * Va dentro de un `<label>` envolvente en vez de con `htmlFor`, para que el texto
 * entero sea zona pulsable: con una casilla de 16px, el objetivo táctil de 44px
 * lo pone la fila, no el cuadrito.
 */
export default function CampoCheck({
  nombre,
  checked,
  onChange,
  error,
  children,
  ancho = false,
}: Props) {
  const ids = idsDeCampo(nombre);

  return (
    <div className={ancho ? "sm:col-span-2" : ""}>
      <label className={FILA_CHECK}>
        <input
          type="checkbox"
          id={ids.input}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? ids.error : undefined}
          className={CASILLA}
        />
        <span>{children}</span>
      </label>
      {error && (
        <p id={ids.error} className={ERROR}>
          {error}
        </p>
      )}
    </div>
  );
}
