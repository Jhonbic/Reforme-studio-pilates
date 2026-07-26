"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Notificacion, TipoNotificacion } from "@/lib/admin/types";

/**
 * Color del punto de cada aviso.
 *
 * ⚠️ **El color nunca va solo**: cada aviso lleva su texto y su «cuándo», y el
 * punto es un refuerzo, no la información. Misma doctrina que `EstadoBadge` y
 * `Variacion`. Salen de `--color-estado-*`, los tokens reservados para estado —
 * no de la paleta de gráficos ni de la de marca.
 */
const PUNTO: Record<TipoNotificacion, string> = {
  aviso: "bg-[var(--color-estado-aviso)]",
  ok: "bg-[var(--color-estado-ok)]",
  info: "bg-verde-300",
};

/** Campanita line-art, del mismo trazo que los iconos de secciones. */
function IconoCampana() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-[18px]"
    >
      <path d="M18 8a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
      <path d="M10.5 19a1.8 1.8 0 0 0 3 0" />
    </svg>
  );
}

/**
 * Avisos del estudio en la cabecera.
 *
 * ⚠️ **No hay ningún sistema de notificaciones detrás**: es maqueta de UI, y el
 * propio panel lo dice al final de la lista. El primer aviso sí sale de datos
 * reales del mock (las membresías por vencer, vía `getNotificaciones()`), para
 * que no pueda contradecir a la cifra del dashboard.
 *
 * «Marcar todas como leídas» **sí funciona**, pero solo en esta pantalla: al
 * recargar vuelven. No se disimula — es lo mismo que hace el alta de cliente.
 */
export default function Campana({ avisos }: { avisos: Notificacion[] }) {
  const [abierto, setAbierto] = useState(false);
  /* Estado local para poder marcar leídas sin backend. El servidor manda en el
     primer render, así que no hay desajuste de hidratación. */
  const [leidas, setLeidas] = useState<string[]>([]);
  const caja = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);

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

  const esLeida = (n: Notificacion) => n.leida || leidas.includes(n.id);
  const sinLeer = avisos.filter((n) => !esLeida(n)).length;

  return (
    <div ref={caja} className="relative shrink-0">
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-haspopup="menu"
        /* El nombre accesible lleva la cuenta: quien no ve el punto tiene que
           enterarse igual de que hay avisos sin leer. */
        aria-label={
          sinLeer
            ? `Notificaciones, ${sinLeer} sin leer`
            : "Notificaciones, ninguna sin leer"
        }
        className={`control-fx relative flex size-11 items-center justify-center overflow-hidden rounded-full bg-dorado text-white transition-[background-color,box-shadow] duration-300 ${
          abierto ? "bg-dorado-dark ring-2 ring-dorado/40" : "hover:bg-dorado-dark"
        }`}
      >
        {!abierto && <span className="control-sheen" aria-hidden="true" />}
        <IconoCampana />
        {/* El punto va sobre el borde del círculo y lleva un anillo del color
            del fondo para que no se confunda con el dorado de debajo. */}
        {sinLeer > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-2 top-2 size-2.5 rounded-full bg-[var(--color-estado-grave)] ring-2 ring-arena"
          />
        )}
      </button>

      {abierto && (
        /* `absolute` + `right-0`: en el flujo empujaría el título, y anclado a
           la derecha no se sale por el borde de la pantalla. En móvil se limita
           con `w-[calc(100vw-2rem)]` para no desbordar a 375px. */
        <div
          role="menu"
          aria-label="Notificaciones"
          className="absolute right-0 top-full z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-beige bg-white shadow-lift"
        >
          <div className="flex items-center justify-between gap-2 border-b border-beige px-4 py-3">
            <p className="eyebrow text-dorado-dark">Notificaciones</p>
            {sinLeer > 0 && (
              <button
                type="button"
                onClick={() => setLeidas(avisos.map((n) => n.id))}
                className="rounded-full px-2 py-1 text-xs text-verde-300 transition-colors duration-200 hover:text-dorado-dark"
              >
                Marcar leídas
              </button>
            )}
          </div>

          <ul className="max-h-80 divide-y divide-beige overflow-y-auto">
            {avisos.map((n) => {
              const leida = esLeida(n);
              return (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    role="menuitem"
                    onClick={() => setAbierto(false)}
                    className={`flex gap-3 px-4 py-3 transition-colors duration-200 hover:bg-arena/70 ${
                      leida ? "" : "bg-dorado/5"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${PUNTO[n.tipo]} ${
                        leida ? "opacity-40" : ""
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-sm leading-snug ${
                          leida ? "text-verde-700" : "font-semibold text-verde"
                        }`}
                      >
                        {n.titulo}
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-verde-300">
                        {n.detalle}
                      </span>
                      <span className="mt-1 block text-xs text-verde-300">
                        {n.cuando}
                        {!leida && (
                          <>
                            {" · "}
                            <span className="text-dorado-dark">sin leer</span>
                          </>
                        )}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Se dice aquí y no se disimula: son maqueta. */}
          <p className="border-t border-beige bg-arena/60 px-4 py-2.5 text-xs leading-snug text-verde-300">
            Avisos de ejemplo: todavía no hay sistema de notificaciones.
          </p>
        </div>
      )}
    </div>
  );
}
