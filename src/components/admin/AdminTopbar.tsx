"use client";

import { usePathname } from "next/navigation";
import { seccionActual } from "./secciones";

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
export default function AdminTopbar() {
  const seccion = seccionActual(usePathname());

  return (
    <div className="border-b border-beige/70 bg-arena/85 backdrop-blur lg:sticky lg:top-0 lg:z-20">
      {/* Mismo ancho máximo que el contenido: el título queda a plomo con la
          primera tarjeta de la rejilla. */}
      <div className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6 lg:px-6 lg:py-5 xl:px-8">
        <p className="eyebrow text-dorado-dark">Panel administrativo</p>
        <h1 className="mt-1.5 font-display text-2xl text-verde sm:text-3xl">
          {seccion.label}
        </h1>
      </div>
    </div>
  );
}
