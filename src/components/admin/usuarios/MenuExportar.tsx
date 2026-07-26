"use client";

import { useEffect, useRef, useState } from "react";
import { numero } from "@/lib/admin/format";

type Props = {
  /** Cuántos clientes se descargarían con los filtros puestos ahora. */
  totalClientes: number;
  totalEquipo: number;
  /** Recibe qué listados se han marcado. Al menos uno viene siempre en `true`. */
  onExportar: (opciones: { clientes: boolean; equipo: boolean }) => void;
  className: string;
};

const FILA =
  "flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl px-3 text-sm text-verde-700 transition-colors duration-200 hover:bg-arena/70";

/**
 * Elige qué listados exportar antes de descargar.
 *
 * Existe porque los dos listados son independientes: estar mirando el Equipo no
 * quiere decir que solo se quiera el Equipo. Sin esta pregunta, exportar los dos
 * obligaba a cambiar de pestaña y descargar dos veces.
 *
 * ⚠️ **Cada listado sale en su propio archivo, no en uno solo.** Clientes y
 * Equipo tienen columnas distintas (plan y vencimiento frente a rol y clases por
 * semana): metidos en la misma hoja, la mitad de las celdas quedarían vacías y
 * dejaría de poder ordenarse o sumarse. Son dos tablas, no una.
 *
 * ⚠️ **Los recuentos van en las propias etiquetas.** No es decoración: los
 * filtros de estado y plan **se ocultan** en la pestaña de Equipo pero siguen
 * puestos, así que se puede exportar Clientes con un filtro que no está a la
 * vista. El número al lado es lo que impide que eso sea una sorpresa.
 */
export default function MenuExportar({
  totalClientes,
  totalEquipo,
  onExportar,
  className,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [clientes, setClientes] = useState(true);
  const [equipo, setEquipo] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);

  /* Mismo comportamiento que el selector de periodo del dashboard: se cierra al
     pulsar fuera y con Escape. Al cerrar con Escape el foco vuelve al botón —
     si no, se quedaría en un elemento que ya no está en pantalla. */
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(false);
        botonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  const nada = !clientes && !equipo;

  function confirmar() {
    onExportar({ clientes, equipo });
    setAbierto(false);
    botonRef.current?.focus();
  }

  return (
    <div ref={caja} className="relative">
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-haspopup="true"
        className={className}
      >
        <span className="control-sheen control-sheen--lento" aria-hidden="true" />
        <span aria-hidden="true">↓</span>
        Exportar
      </button>

      {abierto && (
        /* `absolute` y anclado a la derecha: en el flujo empujaría la fila de
           pestañas al abrirse. `right-0` para que no se salga por el borde
           derecho de la pantalla, que es donde vive el botón. */
        <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-beige bg-white p-3 shadow-lift">
          <p className="mb-2 px-3 text-xs uppercase tracking-[0.14em] text-verde-300">
            Qué exportar
          </p>

          <label className={FILA}>
            <input
              type="checkbox"
              checked={clientes}
              onChange={(e) => setClientes(e.target.checked)}
              className="size-4 shrink-0 accent-dorado"
            />
            <span className="flex-1">Clientes</span>
            <span className="tabular-nums text-verde-300">
              {numero(totalClientes)}
            </span>
          </label>

          <label className={FILA}>
            <input
              type="checkbox"
              checked={equipo}
              onChange={(e) => setEquipo(e.target.checked)}
              className="size-4 shrink-0 accent-dorado"
            />
            <span className="flex-1">Equipo</span>
            <span className="tabular-nums text-verde-300">
              {numero(totalEquipo)}
            </span>
          </label>

          <button
            type="button"
            onClick={confirmar}
            disabled={nada}
            className="control-fx relative mt-3 flex min-h-[44px] w-full items-center justify-center overflow-hidden rounded-full bg-verde px-4 text-sm text-arena transition-colors duration-300 hover:bg-verde-700 disabled:opacity-40 disabled:hover:bg-verde"
          >
            {!nada && <span className="control-sheen" aria-hidden="true" />}
            Descargar
          </button>

          {/* Se dice antes de descargar, no después: dos archivos donde
              esperabas uno parece un fallo si nadie lo avisa. */}
          <p
            aria-live="polite"
            className="mt-2 min-h-8 px-1 text-xs leading-snug text-verde-300"
          >
            {nada
              ? "Marca al menos uno."
              : clientes && equipo
                ? "Se descargarán 2 archivos, uno por listado."
                : "Se descargará 1 archivo con los filtros puestos."}
          </p>
        </div>
      )}
    </div>
  );
}
