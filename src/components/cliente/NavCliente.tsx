"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Las cuatro secciones del área de cliente (decisión del usuario, oct 2026):
 * antes todo iba en una sola página larga, y «Reservar» quedaba a varias
 * pantallas de distancia en el móvil.
 *
 * Enlaces con `aria-current` y no `role="tab"`: son rutas, se pueden abrir y
 * compartir. En el móvil la fila se desliza con el dedo si no cabe.
 */
const SECCIONES = [
  { href: "/mi-cuenta", label: "Inicio" },
  { href: "/mi-cuenta/reservar", label: "Reservar" },
  { href: "/mi-cuenta/planes", label: "Planes" },
  { href: "/mi-cuenta/configuracion", label: "Mi cuenta" },
];

export default function NavCliente() {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones de mi cuenta" className="border-t border-arena/15">
      <ul className="relative mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
        {SECCIONES.map((s) => {
          const activa = s.href === "/mi-cuenta" ? pathname === s.href : pathname.startsWith(s.href);
          return (
            <li key={s.href} className="shrink-0">
              <Link
                href={s.href}
                aria-current={activa ? "page" : undefined}
                className={`inline-flex min-h-[44px] items-center rounded-full px-4 text-sm transition-colors duration-300 ${
                  activa ? "bg-dorado text-verde-900" : "text-beige/85 hover:text-arena"
                }`}
              >
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
