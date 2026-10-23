"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import HeroFX from "@/components/fx/HeroFX";
import { useSidebar } from "@/context/SidebarContext";
import { seccionActual, subseccionDe } from "./secciones";

/**
 * Cabecera del panel: navegación, «Volver» y título. La cuenta está en la
 * barra lateral (`AppSidebar`).
 *
 * El título de cada página vivía dentro de la propia página; al subirlo aquí se
 * gana altura útil (en móvil eran ~120px de scroll antes de ver un solo dato) y
 * el contexto deja de desaparecer al bajar, porque la barra es pegajosa.
 *
 * Es cliente por `usePathname`: el título sale del MISMO listado que pinta la
 * navegación (`secciones.tsx`), así que menú y título no se pueden
 * desincronizar.
 *
 * ⚠️ **Esta es la ÚNICA barra superior del panel.** Hubo un `AppHeader` aparte
 * durante una fase; se retiró porque una franja entera para dos controles se
 * come ~64px de alto en todas las pantallas. El botón de la navegación se
 * mudó a esta misma fila.
 */
/** Botón redondo de la cabecera. El ☰ (solo móvil) va sin borde sobre el
 *  verde; «Volver» (solo escritorio) con borde sobre arena.
 *  ⚠️ Sin `display` aquí: va en cada botón. `hidden` + `inline-flex` en la
 *  misma clase hacía ganar a `inline-flex` y el botón no se ocultaba. */
const BOTON =
  "h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado";

export default function AdminTopbar() {
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
       para cambiar de sección.

       ⚠️ **Dos caras** (decisión del usuario, oct 2026): en MÓVIL es una barra
       de marca, verde como la lateral y con sus motas: ☰ a la izquierda (sin
       borde) y el logo a la derecha; sin «Volver» (está el del navegador).
       Sin «Panel administrativo» ni título visible (el `<h1>` sigue, solo para
       lectores de pantalla). En ESCRITORIO, «Volver» y el título sobre arena.
       Un solo DOM: cambia con clases, como el resto del panel. */
    <div className="sticky top-0 z-30 isolate overflow-hidden border-b border-verde-700 bg-verde lg:border-beige/70 lg:bg-arena/85 lg:backdrop-blur">
      {/* Las motas de la lateral, solo en móvil. `goteo={false}`: aquí casi
          todo clic va a un control. */}
      <HeroFX className="-z-10 lg:hidden" goteo={false} />
      {/* Mismo ancho máximo que el contenido: el título queda a plomo con la
          primera tarjeta de la rejilla. */}
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:justify-start lg:px-6 lg:py-5 xl:px-8">
        {/* ☰ SOLO en móvil: allí la navegación es un cajón y este botón es
            la única forma de abrirlo. `aria-expanded` porque el estado del
            cajón solo lo ve quien mira la pantalla. */}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={visible ? "Cerrar navegación" : "Abrir navegación"}
          aria-expanded={visible}
          className={`${BOTON} -ml-2 inline-flex text-arena hover:text-dorado-light lg:hidden`}
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

        {/* Logo solo en móvil, a la derecha: en escritorio ya está en la lateral. */}
        <Logo size={24} layout="horizontal" href="/admin" className="text-arena lg:hidden" />

        {/* Solo escritorio: en el móvil la barra es de marca y basta el
            «atrás» del sistema. */}
        <button
          type="button"
          onClick={volver}
          aria-label="Volver a la página anterior"
          title="Volver"
          className={`${BOTON} hidden border border-beige text-verde hover:border-dorado lg:inline-flex`}
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

        {/* `min-w-0` para que un título largo se recorte en vez de desbordar.
            ⚠️ En móvil es `sr-only` el bloque entero, no solo el `<h1>`: así
            sale del flujo flex. Si ocupara su hueco (aunque vacío), el
            `justify-between` dejaría el logo en medio y no en la esquina. */}
        <div className="sr-only lg:not-sr-only lg:min-w-0">
          {/* En una subsección el eyebrow deja de ser decorativo y pasa a ser
              la salida en escritorio. En móvil sobra: está «Volver». */}
          {sub ? (
            <Link
              href={sub.volverA}
              className="eyebrow hidden items-center gap-1.5 text-dorado-tinta transition-colors duration-300 hover:text-verde lg:inline-flex"
            >
              <span aria-hidden="true">←</span>
              {sub.volverLabel}
            </Link>
          ) : (
            <p className="eyebrow hidden text-dorado-tinta lg:block">Panel administrativo</p>
          )}
          {/* ⚠️ `<p>` y no `<h1>` (oct 2026): cada página trae su propio
              `<h1>` (la ficha, con el nombre del cliente), y con los dos un
              lector de pantalla oía dos títulos principales por página. Mismo
              criterio que `ClienteTopbar`. */}
          <p className="truncate font-display text-3xl text-verde lg:mt-1.5">
            {sub ? sub.label : seccion.label}
          </p>
        </div>
      </div>
    </div>
  );
}
