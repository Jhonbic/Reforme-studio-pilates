"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const seccion = seccionActual(pathname);
  const { toggleSidebar, visible } = useSidebar();
  /* Una subsección titula por sí misma: en `/admin/usuarios/nuevo` el menú marca
     «Usuarios» (bien, es donde estás), pero titular «Usuarios» sería falso. */
  const sub = subseccionDe(pathname);

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
          {/* `aria-expanded` y no solo el icono: el dibujo cambia de ☰ a ✕,
              pero eso solo lo ve quien mira la pantalla. Qué alterna —la
              columna de escritorio o el cajón móvil— lo decide el contexto,
              que está suscrito al breakpoint. */}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={visible ? "Ocultar navegación" : "Mostrar navegación"}
            aria-expanded={visible}
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
              <path d={visible ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
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
