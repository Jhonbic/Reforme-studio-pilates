"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Campana from "./Campana";
import MenuCuenta from "./MenuCuenta";
import { SUBSECCIONES, seccionActual } from "./secciones";
import type { Notificacion, UsuarioActual } from "@/lib/admin/types";

/**
 * Cabecera de contenido del panel.
 *
 * El título de cada página vivía dentro de la propia página; al subirlo aquí se
 * gana altura útil (en móvil eran ~120px de scroll antes de ver un solo dato) y
 * el contexto deja de desaparecer al bajar, porque la barra es pegajosa.
 *
 * Es cliente por `usePathname`: el título sale del MISMO listado que pinta la
 * navegación (`secciones.tsx`), así que menú y título no se pueden
 * desincronizar.
 */
type Props = {
  usuario: UsuarioActual;
  avisos: Notificacion[];
};

export default function AdminTopbar({ usuario, avisos }: Props) {
  const pathname = usePathname();
  const seccion = seccionActual(pathname);
  /* Una subsección titula por sí misma: en `/admin/usuarios/nuevo` el menú marca
     «Usuarios» (bien, es donde estás), pero titular «Usuarios» sería falso. */
  const sub = SUBSECCIONES[pathname];

  return (
    <div className="border-b border-beige/70 bg-arena/85 backdrop-blur lg:sticky lg:top-0 lg:z-20">
      {/* Mismo ancho máximo que el contenido: el título queda a plomo con la
          primera tarjeta de la rejilla. */}
      {/* La cuenta va en ESTA esquina y no en una franja propia arriba: una
          barra entera para dos datos se come ~64px de alto en todas las
          pantallas, y aquí el hueco a la derecha del título estaba vacío.
          `min-w-0` en el bloque del título para que un título largo se recorte
          él en vez de empujar el menú fuera de la pantalla. */}
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-6 lg:py-5 xl:px-8">
        <div className="min-w-0">
          {/* En una subsección el eyebrow deja de ser decorativo y pasa a ser la
              salida: es el único «volver» que hay, porque el panel no tiene
              migas de pan. */}
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
