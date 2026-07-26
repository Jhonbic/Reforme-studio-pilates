"use client";

import { useSidebar } from "@/context/SidebarContext";
import Dropdown, { DropdownItem, DropdownDivider } from "./Dropdown";
import { useRef, useState, useEffect } from "react";

/** Botón cuadrado de solo icono. 44px de lado, como todo objetivo táctil. */
const BOTON_ICONO =
  "relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-beige text-verde transition-colors duration-300 hover:border-dorado focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado";

export default function AppHeader() {
  const { toggleSidebar, visible } = useSidebar();
  const [searchFocus, setSearchFocus] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  /* Qué alterna (columna de escritorio o cajón móvil) lo decide el contexto,
     que sí está suscrito al breakpoint. */

  return (
    <header className="sticky top-0 z-40 border-b border-beige/50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Abrir/cerrar la navegación. `aria-expanded` y no solo el icono: el
            icono cambia de ☰ a ✕, pero eso solo lo ve quien mira la pantalla. */}
        <button
          type="button"
          onClick={toggleSidebar}
          className={BOTON_ICONO}
          aria-label={visible ? "Ocultar navegación" : "Mostrar navegación"}
          aria-expanded={visible}
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
              d={visible ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
            />
          </svg>
        </button>

        {/* Búsqueda (solo escritorio) */}
        <div className="hidden flex-1 lg:block lg:max-w-sm">
          <div className={`relative transition-all ${searchFocus ? "ring-2 ring-dorado/50" : ""}`}>
            <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-verde/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar clientes, planes..."
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setSearchFocus(false)}
              className="w-full rounded-lg border border-beige/50 bg-arena/30 py-2 pl-10 pr-4 text-sm text-verde placeholder:text-verde/40 transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-dorado/50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-beige/40 px-2 py-0.5 text-xs text-verde/60">
              ⌘K
            </span>
          </div>
        </div>

        {/* Controles derechos */}
        <div className="flex items-center gap-2">
          {/* Notificaciones */}
          <Dropdown
            ariaLabel="Avisos"
            alineacion="derecha"
            clasePanel="w-80"
            claseBoton={BOTON_ICONO}
            etiqueta={
              <>
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
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <span
                  className="absolute right-2 top-2 h-2 w-2 rounded-full bg-dorado"
                  aria-hidden="true"
                />
              </>
            }
          >
            <div className="max-h-96 overflow-y-auto">
              <div className="border-b border-beige px-4 py-3">
                <p className="text-sm text-verde">Nuevo cliente registrado</p>
                <p className="text-xs text-verde-300">Hace 5 minutos</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-sm text-verde">Membresía por vencer</p>
                <p className="text-xs text-verde-300">5 clientes hoy</p>
              </div>
            </div>
          </Dropdown>

          {/* Perfil */}
          <Dropdown
            alineacion="derecha"
            claseBoton="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-beige px-2.5 text-verde transition-colors duration-300 hover:border-dorado focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado"
            etiqueta={
              <>
                {/* `verde-900` sobre dorado: 5,47:1, el par documentado del
                    panel. Con blanco encima el dorado se queda en 2,64:1. */}
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-dorado text-xs font-bold text-verde-900"
                >
                  AD
                </span>
                <span className="hidden text-sm sm:inline">Administrador</span>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </>
            }
          >
            <div className="border-b border-beige px-4 py-3">
              <p className="text-sm text-verde">Administrador</p>
              <p className="text-xs text-verde-300">admin@reforme.com</p>
            </div>
            <DropdownItem deshabilitado>Configuración</DropdownItem>
            <DropdownDivider />
            <DropdownItem deshabilitado>Cerrar sesión</DropdownItem>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}
