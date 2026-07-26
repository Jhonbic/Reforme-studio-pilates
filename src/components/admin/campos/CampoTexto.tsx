"use client";

import type { ComponentProps, ReactNode, Ref } from "react";
import {
  AVISO,
  AYUDA,
  ERROR,
  ETIQUETA,
  control,
  describedBy,
  idsDeCampo,
} from "./estilos";

type Props = Omit<ComponentProps<"input">, "id" | "ref"> & {
  /** Nombre del campo. De él salen los tres ids. */
  nombre: string;
  etiqueta: string;
  /** Texto permanente bajo el campo (formato esperado, de dónde se copia…). */
  ayuda?: ReactNode;
  error?: string;
  /** Ámbar. Señala algo sospechoso pero legítimo: **no impide guardar**. */
  aviso?: string;
  /** Para que el resumen de errores pueda traer el foco hasta aquí. */
  ref?: Ref<HTMLInputElement>;
  /** Ocupa las dos columnas de la rejilla de la sección. */
  ancho?: boolean;
};

/**
 * Campo de texto del panel.
 *
 * ⚠️ **Nada de `forwardRef`.** Esto es React 19: `ref` es una prop normal en los
 * componentes de función y `forwardRef` está desaconsejado.
 */
export default function CampoTexto({
  nombre,
  etiqueta,
  ayuda,
  error,
  aviso,
  ref,
  ancho = false,
  className = "",
  ...props
}: Props) {
  const ids = idsDeCampo(nombre);

  return (
    <div className={`${ancho ? "sm:col-span-2" : ""} ${className}`}>
      <label htmlFor={ids.input} className={ETIQUETA}>
        {etiqueta}
      </label>
      <input
        {...props}
        ref={ref}
        id={ids.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, !!error, !!ayuda)}
        className={control(!!error)}
      />
      {ayuda && (
        <p id={ids.ayuda} className={AYUDA}>
          {ayuda}
        </p>
      )}
      {/* El aviso se calla cuando hay error: dos mensajes a la vez bajo un mismo
          campo compiten, y el que bloquea el guardado es el que importa. */}
      {error ? (
        <p id={ids.error} className={ERROR}>
          {error}
        </p>
      ) : (
        aviso && <p className={AVISO}>{aviso}</p>
      )}
    </div>
  );
}
