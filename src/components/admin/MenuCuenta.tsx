"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { iniciales } from "@/lib/admin/format";
import type { UsuarioActual } from "@/lib/admin/types";

const FILA =
  "flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm text-verde-700 transition-colors duration-200 hover:bg-arena/70 hover:text-verde";

/**
 * Quién ha entrado, en la esquina de la cabecera.
 *
 * Va **dentro de `AdminTopbar`**, a la altura del título, y no en una barra
 * propia arriba del todo: una franja entera para dos datos se come ~64px de
 * alto en todas las pantallas del panel, y en móvil ya hay cabecera de marca y
 * pastillas de navegación por encima. Aquí ocupa un hueco que estaba vacío.
 *
 * ⚠️ **Sin buscador global y sin campana** (se valoraron los dos, ver
 * CONTEXTO): no hay backend al que buscar ni notificaciones que contar, y un
 * punto rojo sobre una campana que nunca cambia es una mentira pequeña que se
 * paga cuando llegue una de verdad.
 *
 * Mismo patrón de desplegable que `MenuExportar` y el selector de periodo del
 * dashboard: `absolute` para no empujar el título, cierre al pulsar fuera y con
 * `Escape`, y el foco vuelve al botón al cerrar.
 */
export default function MenuCuenta({ usuario }: { usuario: UsuarioActual }) {
  const [abierto, setAbierto] = useState(false);
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

  return (
    <div ref={caja} className="relative shrink-0">
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-haspopup="menu"
        /* ⚠️ Dorado con texto BLANCO por decisión del usuario. Medido: blanco
           sobre `#be9b69` da **2,6:1** y sobre `dorado-dark` **3,8:1**; el
           mínimo AA para texto pequeño es 4,5. El nombre es decorativo —quién
           ha entrado no es información que haga falta leer para operar el
           panel, y el desplegable lo repite en verde sobre blanco—, pero queda
           anotado. La alternativa que sí pasa es `text-verde-900` (5,47:1),
           que es lo que usan las pastillas activas del listado. */
        className={`control-fx relative flex min-h-[44px] items-center gap-2.5 overflow-hidden rounded-full py-1 pl-1 pr-2 text-sm text-white transition-[background-color,box-shadow] duration-300 sm:pr-3 ${
          abierto
            ? "bg-dorado-dark ring-2 ring-dorado/40"
            : "bg-dorado hover:bg-dorado-dark"
        }`}
      >
        {!abierto && (
          <span
            className="control-sheen control-sheen--lento"
            aria-hidden="true"
          />
        )}
        {/* El círculo de iniciales es el mismo lenguaje que el avatar de las
            filas de Usuarios, un punto más pequeño: es la misma idea. Sobre
            dorado se invierte — blanco translúcido en vez de dorado al 15 %. */}
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/25 font-display text-sm text-white"
        >
          {iniciales(usuario.nombre)}
        </span>
        {/* El nombre se esconde en móvil, donde el ancho es del título; el
            nombre accesible del botón lo sostiene el `sr-only`. */}
        <span className="hidden sm:inline">{usuario.nombre}</span>
        <span className="sr-only">Cuenta de {usuario.nombre}</span>
        <span
          aria-hidden="true"
          className={`text-xs text-white/80 transition-transform duration-300 ${
            abierto ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {abierto && (
        <div
          role="menu"
          aria-label="Cuenta"
          className="absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-beige bg-white p-3 shadow-lift"
        >
          <div className="px-3 pb-3">
            <p className="font-display text-lg leading-tight text-verde">
              {usuario.nombre}
            </p>
            <p className="mt-0.5 truncate text-sm text-verde-300">
              {usuario.correo}
            </p>
            <p className="eyebrow mt-2 text-dorado-dark">{usuario.rol}</p>
          </div>

          <div className="border-t border-beige pt-2">
            <Link
              href="/"
              role="menuitem"
              className={FILA}
              onClick={() => setAbierto(false)}
            >
              <span aria-hidden="true">↗</span>
              Ver la web pública
            </Link>
            {/* «Cerrar sesión» lleva a `/login` porque es lo que se espera al
                pulsarlo, pero no cierra nada: no hay sesión que cerrar. Se dice
                justo debajo en vez de fingir que sí — misma regla que el alta
                de cliente, que tampoco disimula que no guarda. */}
            <Link
              href="/login"
              role="menuitem"
              className={FILA}
              onClick={() => setAbierto(false)}
            >
              <span aria-hidden="true">←</span>
              Cerrar sesión
            </Link>
          </div>

          <p className="mt-2 px-3 text-xs leading-snug text-verde-300">
            Todavía no hay autenticación: el panel está abierto y esta cuenta es
            un dato de ejemplo.
          </p>
        </div>
      )}
    </div>
  );
}
