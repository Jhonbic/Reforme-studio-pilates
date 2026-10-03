import Link from "next/link";
import type { ReactNode } from "react";
import Card from "../Card";

type Props = {
  titulo: string;
  /** Cuántos hay. Se omite con 0: un «0» en una pastilla parece un aviso. */
  cuantos: number;
  enlace?: { href: string; texto: string };
  /** Lo que se dice cuando no hay nada que hacer. */
  vacio: string;
  children: ReactNode;
};

/**
 * Una lista de trabajo del dashboard: «a quién escribir», «qué clases hay hoy».
 * Es la pieza que JainSportBox tenía y Reforme no: el dashboard anterior
 * enseñaba gráficas, pero al abrirlo no decía qué hacer hoy.
 *
 * ⚠️ **Tope de cinco filas a la vista** (`max-h` + scroll dentro): con dos
 * listas lado a lado, una de treinta empujaría la otra y todo lo de debajo.
 * La tarjeta mide siempre lo mismo y la página no salta según el día.
 */
export default function ListaTrabajo({ titulo, cuantos, enlace, vacio, children }: Props) {
  return (
    <Card densidad="plana" className="flex flex-col">
      <header className="flex items-center gap-2 border-b border-beige px-5 py-4">
        <h2 className="text-base font-bold text-verde">{titulo}</h2>
        {cuantos > 0 && (
          <span className="rounded-full bg-dorado px-2 py-0.5 font-cifra text-xs font-bold text-verde-900">
            {cuantos}
          </span>
        )}
        {enlace && (
          <Link
            href={enlace.href}
            className="ml-auto inline-flex min-h-[44px] items-center text-sm text-dorado-dark underline-offset-4 transition-colors duration-300 hover:text-verde hover:underline"
          >
            {enlace.texto}
          </Link>
        )}
      </header>

      {cuantos === 0 ? (
        <p className="flex min-h-[12rem] flex-1 items-center justify-center px-6 py-8 text-center font-display text-xl text-verde-300">
          {vacio}
        </p>
      ) : (
        <ul className="max-h-[22rem] divide-y divide-beige overflow-y-auto">{children}</ul>
      )}
    </Card>
  );
}

/** Una fila de la lista: lo que es a la izquierda, lo que se hace a la derecha. */
export function FilaTrabajo({
  titulo,
  detalle,
  acciones,
}: {
  titulo: ReactNode;
  detalle: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-5 py-3">
      {/* `basis-48`: si el texto y los botones no caben en la misma línea
          (en móvil no caben), los botones bajan a la suya en vez de dejar el
          nombre en «Valentina Naran…». En escritorio van al lado. */}
      <div className="min-w-0 flex-1 basis-48">
        <p className="truncate text-sm font-bold text-verde">{titulo}</p>
        <div className="mt-0.5 text-xs text-verde-300">{detalle}</div>
      </div>
      {acciones && <div className="flex shrink-0 items-center gap-2">{acciones}</div>}
    </li>
  );
}

const BOTON =
  "inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-xs font-bold transition-colors duration-300";

/**
 * Botón de WhatsApp con el mensaje ya escrito. Sin enlace válido no se pinta:
 * ver `enlaceWhatsApp()`.
 *
 * Verde de MARCA y no el verde de WhatsApp: el icono ya dice qué hace, y un
 * verde chillón en cada fila sería lo único que se viera de la tarjeta.
 */
export function BotonWhatsApp({
  href,
  texto,
  etiqueta,
}: {
  href: string | null;
  texto: string;
  /** Nombre accesible completo: «Recordar a Laura por WhatsApp». En una lista
   *  de diez filas, diez «Recordar» iguales no dicen a quién. */
  etiqueta: string;
}) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={etiqueta}
      className={`${BOTON} bg-verde text-arena hover:bg-verde-700`}
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.553 4.116 1.522 5.85L0 24l6.335-1.48A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.371l-.36-.214-3.73.871.938-3.63-.234-.373A9.817 9.817 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z" />
      </svg>
      {texto}
    </a>
  );
}

/** «Ver ficha»: secundario, con borde, para no competir con el de WhatsApp. */
export function BotonFicha({ href, etiqueta }: { href: string; etiqueta: string }) {
  return (
    <Link
      href={href}
      aria-label={etiqueta}
      className={`${BOTON} border border-beige text-verde-700 hover:border-dorado hover:text-verde`}
    >
      Ver ficha
    </Link>
  );
}
