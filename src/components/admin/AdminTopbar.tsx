"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import type { Notificacion, UsuarioActual } from "@/lib/admin/types";
import Campana from "./Campana";
import MenuCuenta from "./MenuCuenta";
import { seccionActual, subseccionDe } from "./secciones";

type Props = {
  usuario: UsuarioActual;
  avisos: Notificacion[];
};

/**
 * Cabecera del panel: título, avisos y cuenta.
 *
 * El título de cada página vivía dentro de la propia página; al subirlo aquí se
 * gana altura útil (en móvil eran ~120px de scroll antes de ver un solo dato) y
 * el contexto deja de desaparecer al bajar, porque la barra es pegajosa.
 *
 * Es cliente por `usePathname`: el título sale del MISMO listado que pinta la
 * navegación (`secciones.tsx`), así que menú y título no se pueden
 * desincronizar. Los datos de cuenta y avisos, en cambio, llegan **como props
 * desde el layout**, que es servidor: así el panel no tiene que pedirlos desde
 * el navegador y las rutas siguen prerenderizándose.
 *
 * ⚠️ **Esta es la ÚNICA barra superior del panel.** Hubo un `AppHeader` aparte
 * durante una fase; se retiró porque una franja entera para dos controles se
 * come ~64px de alto en todas las pantallas, y aquí el hueco a la derecha del
 * título ya estaba vacío. El botón de la navegación se mudó a esta misma fila.
 */
export default function AdminTopbar({ usuario, avisos }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const seccion = seccionActual(pathname);
  const { toggleSidebar, visible } = useSidebar();
  /* Una subsección titula por sí misma: en `/admin/usuarios/nuevo` el menú marca
     «Usuarios» (bien, es donde estás), pero titular «Usuarios» sería falso. */
  const sub = subseccionDe(pathname);

  /* Cuántas páginas DEL PANEL hay detrás de la actual en el historial. La
     topbar vive en el layout y no se desmonta al cambiar de página, así que
     sobrevive a la navegación. Refs y no estado: solo las lee el clic.
     ⚠️ Se compara con la ruta anterior en vez de contar ejecuciones del
     efecto: en desarrollo React lo ejecuta dos veces al montar. */
  const profundidad = useRef(0);
  const rutaAnterior = useRef<string | null>(null);
  const volviendo = useRef(false);
  useEffect(() => {
    if (rutaAnterior.current !== null && rutaAnterior.current !== pathname) {
      profundidad.current = volviendo.current
        ? Math.max(0, profundidad.current - 1)
        : profundidad.current + 1;
      volviendo.current = false;
    }
    rutaAnterior.current = pathname;
  }, [pathname]);

  /**
   * «Volver» = la página anterior, como el botón del navegador (decisión del
   * usuario, en lugar de la ✕ que plegaba la barra).
   *
   * ⚠️ Pero solo mientras la anterior sea del panel: quien entra por un
   * enlace directo (un correo, un marcador) no tiene «anterior» dentro, y
   * `router.back()` lo sacaría de la web. Entonces sube a la sección madre
   * (de una ficha, a Usuarios). En el Dashboard sin historial no hace nada:
   * no hay nada «encima» en el panel.
   */
  function volver() {
    if (profundidad.current > 0) {
      volviendo.current = true;
      router.back();
      return;
    }
    const madre = sub?.volverA ?? seccion.href;
    if (madre !== pathname) router.push(madre);
    else if (pathname !== "/admin") router.push("/admin");
  }

  return (
    /* `sticky top-0` también en móvil, no solo en `lg`: aquí vive el botón que
       abre la navegación, y si se fuera con el scroll habría que subir del todo
       para cambiar de sección. */
    <div className="sticky top-0 z-30 border-b border-beige/70 bg-arena/85 backdrop-blur">
      {/* Mismo ancho máximo que el contenido: el título queda a plomo con la
          primera tarjeta de la rejilla.
          `min-w-0` en el bloque del título para que un título largo se recorte
          él en vez de empujar el menú fuera de la pantalla. */}
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-6 lg:py-5 xl:px-8">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {/* ☰ SOLO en móvil: allí la navegación es un cajón y este botón es
              la única forma de abrirlo. En escritorio la barra lateral ya no
              se pliega: su sitio lo ocupa «Volver». `aria-expanded` porque el
              estado del cajón solo lo ve quien mira la pantalla. */}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={visible ? "Cerrar navegación" : "Abrir navegación"}
            aria-expanded={visible}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-beige text-verde transition-colors duration-300 hover:border-dorado focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado lg:hidden"
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
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <button
            type="button"
            onClick={volver}
            aria-label="Volver a la página anterior"
            title="Volver"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-beige text-verde transition-colors duration-300 hover:border-dorado focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado"
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
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
          </button>

          <div className="min-w-0">
            {/* En una subsección el eyebrow deja de ser decorativo y pasa a ser
                la salida: es el único «volver» que hay, porque el panel no
                tiene migas de pan. */}
            {sub ? (
              <Link
                href={sub.volverA}
                className="eyebrow inline-flex items-center gap-1.5 text-dorado-dark transition-colors duration-300 hover:text-verde"
              >
                <span aria-hidden="true">←</span>
                {sub.volverLabel}
              </Link>
            ) : (
              <p className="eyebrow text-dorado-dark">Panel administrativo</p>
            )}
            <h1 className="mt-1.5 truncate font-display text-2xl text-verde sm:text-3xl">
              {sub ? sub.label : seccion.label}
            </h1>
          </div>
        </div>

        {/* Campana y cuenta forman un solo bloque en la esquina: son «quién
            soy y qué me ha pasado», no dos herramientas distintas. */}
        <div className="flex shrink-0 items-center gap-2">
          <Campana avisos={avisos} />
          <MenuCuenta usuario={usuario} />
        </div>
      </div>
    </div>
  );
}
