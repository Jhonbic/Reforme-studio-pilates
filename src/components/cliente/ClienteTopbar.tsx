"use client";

import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import HeroFX from "@/components/fx/HeroFX";
import { useSidebar } from "@/context/SidebarContext";
import { seccionClienteActual } from "./seccionesCliente";

/**
 * Cabecera del área de cliente, con las dos caras de la del panel
 * (`AdminTopbar`): en MÓVIL, barra de marca verde con motas, ☰ que abre la
 * barra lateral y el logo; en ESCRITORIO, sobre arena, la sección en la que
 * está. El título sale de la ruta (`seccionesCliente.tsx`), así que menú y
 * título no se pueden contradecir.
 *
 * El título va en un `<p>`, no en un `<h1>`: cada página ya tiene el suyo
 * («Hola, Mateo», «Elige tu plan»…), y dos `<h1>` se anunciarían dos veces.
 */
export default function ClienteTopbar() {
  const pathname = usePathname();
  const seccion = seccionClienteActual(pathname);
  const { toggleSidebar, visible } = useSidebar();

  return (
    <div className="sticky top-0 z-30 isolate overflow-hidden border-b border-verde-700 bg-verde lg:border-beige/70 lg:bg-arena/85 lg:backdrop-blur">
      <HeroFX className="-z-10 lg:hidden" goteo={false} />
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:justify-start lg:py-5">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={visible ? "Cerrar navegación" : "Abrir navegación"}
          aria-expanded={visible}
          className="-ml-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-arena transition-colors duration-300 hover:text-dorado-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado lg:hidden"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <Logo size={24} layout="horizontal" href="/mi-cuenta" className="text-arena lg:hidden" />

        <div className="hidden min-w-0 lg:block">
          <p className="eyebrow text-dorado-tinta">Mi cuenta</p>
          <p className="mt-1.5 truncate font-display text-3xl text-verde">{seccion.label}</p>
        </div>
      </div>
    </div>
  );
}
