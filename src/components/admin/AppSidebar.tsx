"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import Logo from "@/components/Logo";
import HeroFX from "@/components/fx/HeroFX";
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
        /* ⚠️ **Verde de marca con las motas doradas detrás**, no blanca. La
           navegación es la única superficie del panel que está siempre en
           pantalla, así que es donde el verde se ve todo el rato sin robarle
           contraste a las tarjetas de datos, que se quedan blancas.

           `isolate` + el canvas a `-z-10` lo dejan DETRÁS del contenido sin
           envolver a los hijos: envolverlos rompería el `flex-col` y el
           `flex-1` del `<nav>`. Es el mismo montaje que usa `Card` con `fx`.
           `overflow-hidden` recorta el canvas al borde de la columna. */
        className={`fixed left-0 top-0 z-40 isolate flex h-[100svh] w-64 flex-col overflow-hidden border-r border-verde-700 bg-verde transition-[transform,visibility] duration-300 lg:translate-x-0 lg:transition-[width,visibility] ${
          isMobileOpen ? "visible translate-x-0" : "invisible -translate-x-full"
        } ${
          isExpanded
            ? "lg:visible lg:sticky lg:w-64"
            : "lg:invisible lg:w-0 lg:overflow-hidden lg:border-0"
        }`}
      >
        {/* ⚠️ `goteo={false}`: en el panel casi todo clic va a un control, y una
            onda decorativa encima confunde sobre si la acción se registró. Aquí
            además el clic suele ser un enlace que cambia de página. Se apaga
            solo con `prefers-reduced-motion` y es `pointer-events-none`, así que
            nunca se come una pulsación de la navegación. */}
        <HeroFX className="-z-10" goteo={false} />
        {/* Logo area (solo móvil) */}
        {/* El logo se ve también en móvil: ahora el cajón cubre la pantalla
            entera, y sin él la navegación no diría de qué producto es. */}
        <div className="flex items-center justify-between gap-3 border-b border-verde-700/70 px-6 py-4">
          {/* El isotipo y el texto van con `currentColor`, así que basta con
              teñir el contenedor: `text-arena` es el par documentado sobre el
              verde de marca. */}
          <Logo
            size={30}
            layout="horizontal"
            href="/admin"
            className="text-arena"
          />

          {/* ⚠️ Cierre explícito, solo en móvil. Con el cajón abierto, el
              scrim (z-30) queda por encima de la cabecera, así que el botón
              que lo abrió NO se puede volver a pulsar: sin esta ✕ la única
              salida sería adivinar que hay que tocar la zona oscurecida. */}
          <button
            type="button"
            onClick={closeMobileSidebar}
            aria-label="Cerrar navegación"
            className="-mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-beige/70 transition-colors duration-300 hover:text-arena focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado lg:hidden"
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
                  /* La sección activa NO cambia: `bg-dorado text-verde-900` es
                     el par que ya marca «esto es lo seleccionado» en las
                     pestañas, las pastillas de filtro y la paginación. Lo que
                     cambia es el reposo, que pasa de tinta verde sobre blanco a
                     beige sobre verde. */
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                    activa
                      ? "bg-dorado text-verde-900 shadow-sm"
                      : "text-beige hover:bg-verde-700/70 hover:text-arena active:bg-verde-700"
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
        <div className="border-t border-verde-700/70 p-4">
          <Link
            href="/"
            onClick={handleNavigation}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-beige/80 transition-colors hover:bg-verde-700/70 hover:text-arena"
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
