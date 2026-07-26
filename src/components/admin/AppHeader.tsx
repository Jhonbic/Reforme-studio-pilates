"use client";

import { useSidebar } from "@/context/SidebarContext";
import { useRef, useState, useEffect } from "react";

export default function AppHeader() {
  const { toggleSidebar, toggleMobileSidebar, isMobileOpen } = useSidebar();
  const [searchFocus, setSearchFocus] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
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

  const handleToggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-beige/50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Botón toggle sidebar */}
        <button
          onClick={handleToggleSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-beige/50 text-verde transition-colors hover:bg-arena/50 active:bg-arena lg:hidden"
          aria-label="Toggle sidebar"
        >
          {isMobileOpen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
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
          <div className="relative">
            <button
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setProfileOpen(false);
              }}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-beige/50 text-verde transition-colors hover:bg-arena/50"
              aria-label="Notificaciones"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-dorado" />
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-lg border border-beige/50 bg-white shadow-lg">
                <div className="border-b border-beige/50 px-4 py-3">
                  <h3 className="font-semibold text-verde">Notificaciones</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <div className="border-b border-beige/30 px-4 py-3 hover:bg-arena/30">
                    <p className="text-sm font-medium text-verde">Nuevo cliente registrado</p>
                    <p className="text-xs text-verde/60">Hace 5 minutos</p>
                  </div>
                  <div className="border-b border-beige/30 px-4 py-3 hover:bg-arena/30">
                    <p className="text-sm font-medium text-verde">Membresía por vencer</p>
                    <p className="text-xs text-verde/60">5 clientes hoy</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Perfil usuario */}
          <div className="relative">
            <button
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotificationsOpen(false);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-beige/50 px-3 text-verde transition-colors hover:bg-arena/50"
            >
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-dorado to-dorado-dark flex items-center justify-center text-xs font-bold text-white">
                AD
              </div>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg border border-beige/50 bg-white shadow-lg">
                <div className="px-4 py-3 border-b border-beige/50">
                  <p className="text-sm font-medium text-verde">Administrador</p>
                  <p className="text-xs text-verde/60">admin@reforme.com</p>
                </div>
                <button className="w-full px-4 py-2 text-left text-sm text-verde hover:bg-arena/30 transition-colors">
                  ⚙️ Configuración
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-verde hover:bg-arena/30 transition-colors border-t border-beige/50">
                  🚪 Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
