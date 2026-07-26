"use client";

import Modal from "./Modal";

/* ⚠️ Solo DOS variantes, y la de «aviso» ámbar no existe a propósito.
   `--color-estado-aviso` (#b47612) es un tono medio: sobre él, el texto blanco
   da 3,79:1 y el `verde-900` da 3,75:1 — los dos por debajo del 4,5 que pide AA
   para texto normal. Un botón sólido ámbar es ilegible se pinte como se pinte,
   así que se queda fuera en vez de enviarse roto. Una confirmación es o
   destructiva o no lo es; para el resto de matices está el texto del mensaje.

   Los dos que sí valen, medidos:
   - peligro: blanco sobre `--color-estado-grave` (#b4442a) → 5,53:1
   - normal:  `verde-900` sobre `dorado` → 5,47:1 (el mismo par que ya usan la
     sección activa de `AdminNav` y la pastilla de filtro seleccionada) */
const VARIANTES = {
  peligro:
    "bg-[var(--color-estado-grave)] text-white hover:bg-[color-mix(in_srgb,var(--color-estado-grave)_85%,black)]",
  normal: "bg-dorado text-verde-900 hover:bg-dorado-dark",
} as const;

type Props = {
  abierto: boolean;
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  variante?: keyof typeof VARIANTES;
  cargando?: boolean;
  onConfirmar: () => void | Promise<void>;
  onCancelar: () => void;
};

/**
 * Confirmación antes de una acción que no se puede deshacer.
 *
 * Se monta sobre `Modal`, así que hereda su gestión de foco, el cierre con
 * `Escape` y el clic en el fondo.
 */
export default function ConfirmDialog({
  abierto,
  titulo,
  mensaje,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  variante = "normal",
  cargando = false,
  onConfirmar,
  onCancelar,
}: Props) {
  return (
    <Modal
      abierto={abierto}
      onCerrar={onCancelar}
      titulo={titulo}
      /* Mientras la acción está en vuelo no hay salida: cerrar a medias dejaría
         a la persona sin saber si se llegó a hacer. */
      cerrable={!cargando}
      tamano="sm"
    >
      <p className="text-verde-700">{mensaje}</p>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancelar}
          disabled={cargando}
          className="control-fx relative inline-flex min-h-[44px] items-center justify-center overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="control-sheen" aria-hidden="true" />
          {textoCancelar}
        </button>

        <button
          type="button"
          onClick={onConfirmar}
          disabled={cargando}
          className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-70 ${VARIANTES[variante]}`}
        >
          {cargando && (
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
          {cargando ? "Procesando…" : textoConfirmar}
        </button>
      </div>
    </Modal>
  );
}
