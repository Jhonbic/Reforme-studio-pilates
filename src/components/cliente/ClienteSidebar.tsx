"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import HeroFX from "@/components/fx/HeroFX";
import { useSidebar } from "@/context/SidebarContext";
import { iniciales } from "@/lib/admin/format";
import { cerrarSesion } from "@/lib/auth/acciones";
import { SECCIONES_CLIENTE, esActivaCliente } from "./seccionesCliente";

/**
 * Barra lateral del área de cliente, la MISMA que la del panel (`AppSidebar`;
 * decisión del usuario, oct 2026): verde de marca con las motas, quién ha
 * entrado arriba y las secciones. En escritorio es una columna fija; en móvil,
 * un cajón que abre el ☰ de la cabecera.
 *
 * Los detalles del montaje (visibility para sacarla del tabulador, alto de
 * viewport para el `sticky`, `isolate` + canvas a `-z-10`) están explicados en
 * `AppSidebar`: aquí son los mismos.
 *
 * A diferencia del panel, «Cerrar sesión» va abajo, en la barra: el cliente
 * no tiene una pantalla de «Mi perfil» con más ajustes donde esconderlo.
 */
export default function ClienteSidebar({ nombre, detalle }: { nombre: string; detalle: string }) {
  const { isExpanded, isMobileOpen, closeMobileSidebar } = useSidebar();
  const pathname = usePathname();
  const cerrarCajon = () => {
    if (isMobileOpen) closeMobileSidebar();
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-verde-900/50 lg:hidden"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 isolate flex h-[100svh] w-64 flex-col overflow-hidden border-r border-verde-700 bg-verde transition-[transform,visibility] duration-300 lg:translate-x-0 lg:transition-[width,visibility] ${
          isMobileOpen ? "visible translate-x-0" : "invisible -translate-x-full"
        } ${isExpanded ? "lg:visible lg:sticky lg:w-64" : "lg:invisible lg:w-0 lg:overflow-hidden lg:border-0"}`}
      >
        <HeroFX className="-z-10" goteo={false} />

        <div className="flex items-center justify-between gap-3 border-b border-verde-700/70 px-6 py-4">
          <Logo size={30} layout="horizontal" href="/mi-cuenta" className="text-arena" />
          <button
            type="button"
            onClick={closeMobileSidebar}
            aria-label="Cerrar navegación"
            className="-mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-beige/70 transition-colors duration-300 hover:text-arena focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado lg:hidden"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Quién ha entrado y su plan. Enlace a «Mi cuenta», como en el panel. */}
        <Link
          href="/mi-cuenta/configuracion"
          onClick={cerrarCajon}
          aria-label={`Mi cuenta: ${nombre}, ${detalle}`}
          className="flex items-center gap-3 border-b border-verde-700/70 px-6 py-4 transition-colors hover:bg-verde-700/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dorado"
        >
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-dorado/20 font-display text-base text-dorado-light"
          >
            {iniciales(nombre)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-arena" title={nombre}>
              {nombre}
            </p>
            <p className="mt-0.5 truncate text-xs text-dorado-light">{detalle}</p>
          </div>
        </Link>

        <nav aria-label="Secciones de mi cuenta" className="flex-1 overflow-y-auto px-4 py-6">
          <div className="space-y-1.5">
            {SECCIONES_CLIENTE.map((s) => {
              const activa = esActivaCliente(s.href, pathname);
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  onClick={cerrarCajon}
                  aria-current={activa ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                    activa
                      ? "bg-dorado text-verde-900 shadow-sm"
                      : "text-beige hover:bg-verde-700/70 hover:text-arena active:bg-verde-700"
                  }`}
                >
                  <s.icono />
                  <span>{s.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="space-y-1 border-t border-verde-700/70 p-4">
          <Link
            href="/"
            onClick={cerrarCajon}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-beige/80 transition-colors hover:bg-verde-700/70 hover:text-arena"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Ver la web
          </Link>
          {/* `<form>` con server action y no un enlace: un GET que cierra sesión
              lo dispararía cualquier precarga de enlaces. */}
          <form action={cerrarSesion}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-left text-sm text-beige/80 transition-colors hover:bg-verde-700/70 hover:text-arena"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17l5-5-5-5M20 12H9M12 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
              </svg>
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
