"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import Logo from "@/components/Logo";
import { SECCIONES, esSeccionActiva } from "./secciones";
import HeroFX from "@/components/fx/HeroFX";

export default function AppSidebar() {
  const { isExpanded, toggleSidebar, isMobileOpen, closeMobileSidebar } = useSidebar();
  const pathname = usePathname();

  const handleNavigation = () => {
    if (isMobileOpen) {
      closeMobileSidebar();
    }
  };

  return (
    <>
      {/* Backdrop móvil */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 z-40 flex h-[calc(100vh-64px)] w-64 flex-col border-r border-beige/50 bg-white transition-transform duration-300 lg:relative lg:top-0 lg:z-20 lg:h-full lg:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo area (solo móvil) */}
        <div className="hidden border-b border-beige/50 px-6 py-4 lg:block">
          <Logo size={30} layout="horizontal" href="/admin" />
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
