"use client";

import type { ComponentProps, ReactNode, Ref } from "react";
import {
  AYUDA,
  ERROR,
  ETIQUETA,
  control,
  describedBy,
  idsDeCampo,
} from "./estilos";

type Props = Omit<ComponentProps<"select">, "id" | "ref"> & {
  nombre: string;
  etiqueta: string;
  ayuda?: ReactNode;
  error?: string;
  ref?: Ref<HTMLSelectElement>;
  ancho?: boolean;
  children: ReactNode;
};

/**
 * Desplegable del panel.
 *
 * `<select>` nativo a propósito, como el resto del panel: en móvil abre el
 * selector del sistema, que es mejor que cualquier lista propia, y trae teclado y
 * accesibilidad gratis.
 *
 * ⚠️ **Sin el dash diagonal** (`.control-sheen`) que llevan los demás controles:
 * un `<select>` nativo solo admite `<option>` como hijos, así que no hay dónde
 * colgar el `<span>` del barrido. Ya está documentado en `BarraFiltros`.
 */
export default function CampoSelect({
  nombre,
  etiqueta,
  ayuda,
  error,
  ref,
  ancho = false,
  className = "",
  children,
  ...props
}: Props) {
  const ids = idsDeCampo(nombre);

  return (
    <div className={`${ancho ? "sm:col-span-2" : ""} ${className}`}>
      <label htmlFor={ids.input} className={ETIQUETA}>
        {etiqueta}
      </label>
      <select
        {...props}
        ref={ref}
        id={ids.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, !!error, !!ayuda)}
        className={control(!!error)}
      >
        {children}
      </select>
      {ayuda && (
        <p id={ids.ayuda} className={AYUDA}>
          {ayuda}
        </p>
      )}
      {error && (
        <p id={ids.error} className={ERROR}>
          {error}
        </p>
      )}
    </div>
  );
}
