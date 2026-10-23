import type { Metadata } from "next";
import Logo from "@/components/Logo";
import HeroFX from "@/components/fx/HeroFX";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Página no encontrada · Reforme Studio Pilates",
  robots: { index: false },
};

/**
 * 404 con la marca (oct 2026, revisión antes de presentar). Antes salía la de
 * Next: fondo blanco y «This page could not be found.» en inglés, justo en el
 * momento en que alguien ya está perdido.
 *
 * Dos salidas: la portada y reservar, que es a lo que viene casi todo el que
 * llega a la web. Sirve también para `notFound()` de las páginas (una ficha de
 * cliente que no existe).
 */
export default function NotFound() {
  return (
    <main className="relative isolate flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-verde px-6 py-16 text-center text-arena">
      <HeroFX className="-z-10" />
      <Logo size={44} className="text-arena" />
      <p className="mt-12 font-display text-7xl leading-none text-dorado-light sm:text-8xl" aria-hidden="true">
        404
      </p>
      <h1 className="mt-6 font-display text-3xl sm:text-4xl">Esta página no existe</h1>
      <p className="mx-auto mt-3 max-w-md text-beige/80">
        Puede que el enlace esté mal escrito o que la página se haya movido. Volvamos a tu práctica.
      </p>
      <div className="mt-10 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
        <ButtonLink href="/" variant="gold" size="lg">
          Ir al inicio
        </ButtonLink>
        <ButtonLink href="/registro" variant="outlineLight" size="lg">
          Reservar mi clase
        </ButtonLink>
      </div>
    </main>
  );
}
