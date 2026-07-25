"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SECCIONES, esSeccionActiva } from "./secciones";

/**
 * Navegación del panel. En escritorio vive en la barra lateral; en móvil es una
 * fila de pastillas con scroll horizontal — un cajón desplegable sería un clic
 * de más para solo cuatro secciones.
 */
export default function AdminNav({
  variante,
}: {
  variante: "lateral" | "movil";
}) {
  const pathname = usePathname();
  const esActiva = (href: string) => esSeccionActiva(href, pathname);

  if (variante === "movil") {
    return (
      <nav aria-label="Secciones del panel">
        <ul className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SECCIONES.map((s) => {
            const activa = esActiva(s.href);
            return (
              <li key={s.href} className="shrink-0">
                <Link
                  href={s.href}
                  aria-current={activa ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm transition-colors ${
                    activa
                      ? "bg-dorado text-verde-900"
                      : "bg-verde-700/60 text-beige"
                  }`}
                >
                  <s.icono />
                  {s.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="Secciones del panel">
      <ul className="space-y-1.5">
        {SECCIONES.map((s) => {
          const activa = esActiva(s.href);
          return (
            <li key={s.href}>
              <Link
                href={s.href}
                aria-current={activa ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all duration-300 ${
                  activa
                    ? "bg-dorado text-verde-900"
                    : "text-beige hover:bg-verde-700/70 hover:text-arena"
                }`}
              >
                <s.icono />
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
