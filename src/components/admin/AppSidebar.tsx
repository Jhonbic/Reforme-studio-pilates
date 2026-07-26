"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import Logo from "@/components/Logo";
import { SECCIONES, esSeccionActiva } from "./secciones";

export default function AppSidebar() {
  const { isExpanded, isMobileOpen, closeMobileSidebar } = useSidebar();
  const pathname = usePathname();

  const handleNavigation = () => {
    if (isMobileOpen) {
      closeMobileSidebar();
    }
  };

  return (
    <>
      {/* Fondo oscurecido, solo en móvil, donde la navegación entra por encima
          del contenido. En escritorio ocupa su propia columna y no tapa nada. */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-verde-900/50 lg:hidden"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* ⚠️ En escritorio la barra se **oculta entera** al plegarla, en vez de
          encogerse a una tira de iconos. Una tira de iconos obliga a adivinar
          qué es cada sección (o a añadir tooltips, que en táctil no existen);
          esconderla del todo no pide adivinar nada y devuelve los 256px al
          contenido, que es de lo que se trataba. El botón del header la trae de
          vuelta.

          `lg:sticky` con alto de viewport propio: como hijo flex, sin alto
          explícito el `stretch` la haría tan alta como toda la página y
          `sticky` no tendría recorrido por el que pegarse. */}
      {/* ⚠️ Oculta con `visibility`, no solo con `translate` ni con `inert`.
          `visibility: hidden` saca del orden de tabulación por sí sola —sin
          ella se tabula por una navegación que no está en pantalla— y, a
          diferencia de `inert`, **entiende de breakpoints**: la barra puede
          estar cerrada en móvil y abierta en escritorio a la vez, y eso no se
          puede expresar con una prop de JavaScript sin medir el viewport. */}
      <aside
        /* `top-0` y alto completo: antes arrancaba en `top-16` porque encima
           había una franja de cabecera propia. Esa franja se retiró —la
           cabecera es ahora `AdminTopbar`, una sola—, así que el cajón móvil
           cubre la pantalla entera. */
        className={`fixed left-0 top-0 z-40 flex h-[100svh] w-64 flex-col border-r border-beige bg-white transition-[transform,visibility] duration-300 lg:translate-x-0 lg:transition-[width,visibility] ${
          isMobileOpen ? "visible translate-x-0" : "invisible -translate-x-full"
        } ${
          isExpanded
            ? "lg:visible lg:sticky lg:w-64"
            : "lg:invisible lg:w-0 lg:overflow-hidden lg:border-0"
        }`}
      >
        {/* Logo area (solo móvil) */}
        {/* El logo se ve también en móvil: ahora el cajón cubre la pantalla
            entera, y sin él la navegación no diría de qué producto es. */}
        <div className="flex items-center justify-between gap-3 border-b border-beige/50 px-6 py-4">
          <Logo size={30} layout="horizontal" href="/admin" />

          {/* ⚠️ Cierre explícito, solo en móvil. Con el cajón abierto, el
              scrim (z-30) queda por encima de la cabecera, así que el botón
              que lo abrió NO se puede volver a pulsar: sin esta ✕ la única
              salida sería adivinar que hay que tocar la zona oscurecida. */}
          <button
            type="button"
            onClick={closeMobileSidebar}
            aria-label="Cerrar navegación"
            className="-mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-verde-300 transition-colors duration-300 hover:text-verde focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado lg:hidden"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <div className="space-y-1.5">
            {SECCIONES.map((seccion) => {
              const activa = esSeccionActiva(seccion.href, pathname);
              return (
                <Link
                  key={seccion.href}
                  href={seccion.href}
                  onClick={handleNavigation}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                    activa
                      ? "bg-dorado text-verde-900 shadow-sm"
                      : "text-verde hover:bg-arena/50 active:bg-beige/30"
                  }`}
                  aria-current={activa ? "page" : undefined}
                >
                  <seccion.icono />
                  <span>{seccion.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-beige/50 p-4">
          <Link
            href="/"
            onClick={handleNavigation}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-verde/70 transition-colors hover:bg-arena/50 hover:text-verde"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Ver web pública
          </Link>
        </div>
      </aside>
    </>
  );
}
