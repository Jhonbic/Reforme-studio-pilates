"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import Toast, { type ToastType } from "@/components/admin/Toast";

type Aviso = {
  id: string;
  mensaje: string;
  tipo: ToastType;
  duracion: number;
};

type ToastContextType = {
  /**
   * Muestra un aviso flotante. `duracion` en ms; `0` obliga a descartarlo a
   * mano. Si no se pasa, los errores NO se cierran solos y el resto sí.
   */
  mostrarAviso: (
    mensaje: string,
    tipo?: ToastType,
    duracion?: number,
  ) => void;
  descartarAviso: (id: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/** Un error que se va solo a los 4 s es un error que nadie llega a leer. */
const DURACION_POR_DEFECTO: Record<ToastType, number> = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: 0,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  const descartarAviso = useCallback((id: string) => {
    setAvisos((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const mostrarAviso = useCallback(
    (mensaje: string, tipo: ToastType = "info", duracion?: number) => {
      /* `crypto.randomUUID` y no `Date.now()`: dos avisos disparados en el
         mismo tick (p. ej. al validar varias cosas de golpe) compartirían id y
         React reutilizaría el nodo del primero — el segundo heredaría su
         temporizador y se cerraría antes de tiempo. */
      const id = crypto.randomUUID();
      setAvisos((prev) => [
        ...prev,
        { id, mensaje, tipo, duracion: duracion ?? DURACION_POR_DEFECTO[tipo] },
      ]);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ mostrarAviso, descartarAviso }}>
      {children}

      {/* ⚠️ La región en vivo es ESTE contenedor, que existe siempre, y no cada
          aviso: un lector de pantalla solo anuncia lo que se inserta DENTRO de
          una región que ya estaba en el DOM. Si el `role` viajara en el aviso,
          región y contenido aparecerían a la vez y muchos lectores no dirían
          nada.

          `polite` y no `assertive` (`role="alert"`): estos avisos confirman algo
          que la persona acaba de hacer y está mirando; interrumpir su lectura
          sería peor. Es la misma elección que ya hacen `PanelUsuarios`
          (`role="status"`) y `MenuExportar` (`aria-live="polite"`). Para un
          error que sí bloquea, el patrón del proyecto es `ResumenErrores`, que
          es `role="alert"` de verdad.

          `pointer-events-none` en la pila y `auto` en cada aviso: la columna
          ocupa una franja alta de la pantalla y, sin esto, tragaría los clics
          de lo que hubiera debajo aunque estuviera vacía. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:right-6 sm:w-auto"
      >
        {avisos.map((a) => (
          <div key={a.id} className="pointer-events-auto">
            <Toast
              id={a.id}
              mensaje={a.mensaje}
              tipo={a.tipo}
              duracion={a.duracion}
              onDescartar={descartarAviso}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}
