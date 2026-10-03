import Link from "next/link";
import type { ReactNode } from "react";
import Card from "../Card";

type Props = {
  etiqueta: string;
  /** Ya formateado: «12», «—», «64,3 %». */
  valor: string;
  detalle?: ReactNode;
  /**
   * A dónde lleva. Con enlace, la tarjeta entera es el objetivo y una flecha
   * en la esquina lo anuncia; sin él, es solo una cifra. Mismo criterio que
   * JainSportBox: navegan las cifras detrás de las que hay una lista que
   * atender, no las que son un porcentaje.
   */
  href?: string;
};

/**
 * Cifra de cabecera del dashboard.
 *
 * Las cuatro de una pestaña miden LO MISMO a propósito (rejilla de 2 en móvil y
 * 4 en escritorio): ninguna es más importante que otra, y con tamaños
 * distintos el ojo salta a la grande. Era lo que hacía la rejilla bento
 * anterior, y lo que el usuario sentía desordenado.
 */
export default function Cifra({ etiqueta, valor, detalle, href }: Props) {
  const contenido = (
    <Card as="div" densidad="compacta" sheen className="h-full">
      <div className="flex items-start justify-between gap-2">
        <p className="eyebrow text-verde-300">{etiqueta}</p>
        {href && (
          <svg
            className="h-4 w-4 shrink-0 text-verde-300 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-dorado-dark"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        )}
      </div>
      <p className="mt-3 font-cifra text-3xl font-light leading-none text-verde sm:text-4xl">
        {valor}
      </p>
      {detalle && <div className="mt-2 text-xs text-verde-300">{detalle}</div>}
    </Card>
  );

  if (!href) return contenido;
  return (
    <Link
      href={href}
      className="block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado"
    >
      {contenido}
    </Link>
  );
}
