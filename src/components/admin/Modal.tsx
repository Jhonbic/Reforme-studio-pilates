"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const TAMANOS = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
} as const;

/** Lo que el navegador considera tabulable dentro del diálogo. */
const FOCUSABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
  /** Fila de acciones al pie, separada por una línea. */
  pie?: ReactNode;
  tamano?: keyof typeof TAMANOS;
  /**
   * A `false` desaparecen las tres salidas a la vez (✕, `Escape` y clic en el
   * fondo). Para mientras una acción está en vuelo: cerrar a medias dejaría a
   * la persona sin saber si llegó a ejecutarse.
   */
  cerrable?: boolean;
};

/**
 * Diálogo modal del panel.
 *
 * Va por `createPortal` a `document.body` y no en su sitio del árbol: dentro de
 * la columna de contenido heredaría su `overflow-y-auto` y su contexto de
 * apilado, y quedaría recortado o por debajo de la cabecera.
 */
export default function Modal({
  abierto,
  onCerrar,
  titulo,
  children,
  pie,
  tamano = "md",
  cerrable = true,
}: Props) {
  const dialogoRef = useRef<HTMLDivElement>(null);
  const focoPrevio = useRef<HTMLElement | null>(null);

  /* El portal necesita `document`, que no existe al prerenderizar, y las rutas
     del panel salen `○ Static`: se prerenderizan en el build aunque el
     componente sea de cliente.

     ⚠️ `useSyncExternalStore` y NO `useState` + `useEffect`: el lint de React 19
     prohíbe llamar a `setState` dentro de un efecto (renders en cascada). Es el
     mismo motivo por el que `FormularioAlta` obtiene así la fecha de hoy.
     `subscribe` devuelve una función vacía porque esto no cambia nunca: se pasa
     de servidor a cliente una sola vez, en la hidratación. */
  const montado = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const alPulsarTecla = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && cerrable) {
        e.preventDefault();
        onCerrar();
        return;
      }

      /* Trampa de foco. Sin esto, tabular desde el último control se va a la
         página de detrás —que para quien ve la pantalla sigue tapada por el
         fondo—, y `aria-modal` estaría prometiendo un aislamiento que no
         existe. */
      if (e.key !== "Tab") return;
      const foco = dialogoRef.current?.querySelectorAll<HTMLElement>(FOCUSABLES);
      if (!foco?.length) return;

      const primero = foco[0];
      const ultimo = foco[foco.length - 1];
      const activo = document.activeElement;

      if (e.shiftKey && activo === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && activo === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    },
    [cerrable, onCerrar],
  );

  /* ⚠️ DOS efectos y no uno, y la razón es sutil: `alPulsarTecla` depende de
     `onCerrar`, que casi siempre llega como una función anónima nueva en cada
     render del padre. Si el foco viviera en este mismo efecto, se reengancharía
     con cada render y **devolvería el foco al contenedor del diálogo**, con lo
     que sería imposible escribir en un campo de dentro. El teclado se puede
     reenganchar sin coste; el foco solo puede moverse al abrir y al cerrar. */
  useEffect(() => {
    if (!abierto) return;
    document.addEventListener("keydown", alPulsarTecla);
    return () => document.removeEventListener("keydown", alPulsarTecla);
  }, [abierto, alPulsarTecla]);

  useEffect(() => {
    if (!abierto) return;

    focoPrevio.current = document.activeElement as HTMLElement | null;

    /* Bloquea el scroll de detrás: sin esto, la rueda sobre el fondo desplaza
       la página y al cerrar el modal se ha movido todo. */
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    /* El foco entra al propio diálogo, no a su primer botón: si entrara al
       primero —que suele ser la ✕ o «Cancelar»— un lector empezaría por la
       salida en vez de por el título y el mensaje. Desde el contenedor, la
       primera tabulación llega al primer control igualmente. */
    dialogoRef.current?.focus();

    return () => {
      document.body.style.overflow = overflowPrevio;
      focoPrevio.current?.focus();
    };
  }, [abierto]);

  if (!abierto || !montado) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-verde-900/50"
        aria-hidden="true"
        onClick={cerrable ? onCerrar : undefined}
      />

      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        tabIndex={-1}
        className={`relative z-10 w-full rounded-2xl border border-beige bg-white shadow-lift focus:outline-none ${TAMANOS[tamano]}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-beige px-5 py-4 sm:px-6">
          <h2
            id="modal-titulo"
            className="font-display text-xl text-verde"
          >
            {titulo}
          </h2>
          {cerrable && (
            <button
              type="button"
              onClick={onCerrar}
              className="-mr-2 -mt-1 inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-verde-300 transition-colors duration-300 hover:text-verde focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado"
              aria-label="Cerrar"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Alto máximo para que un contenido largo scrollee DENTRO del modal y
            no empuje el pie fuera de la pantalla en móvil. */}
        <div className="max-h-[70svh] overflow-y-auto px-5 py-5 sm:px-6">
          {children}
        </div>

        {pie && (
          <div className="flex flex-col-reverse gap-3 border-t border-beige bg-arena/40 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            {pie}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
