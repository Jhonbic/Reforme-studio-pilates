import Link from "next/link";
import type { ReactNode } from "react";
import Logo, { Isotype } from "@/components/Logo";
import HeroFX from "@/components/fx/HeroFX";
import SectionWave from "@/components/SectionWave";

type AuthShellProps = {
  children: ReactNode;
  /** Texto grande del panel de marca */
  headline: string;
  /** Subtítulo del panel de marca */
  tagline: string;
};

const RADIAL =
  "radial-gradient(120% 80% at 30% 20%, #2f5040 0%, #284435 50%, #1b2f24 100%)";

/**
 * Layout de pantalla completa para /login y /registro.
 * Escritorio: panel de marca (verde) a la izquierda + formulario a la derecha.
 * Móvil: banda de marca premium arriba (verde con estela dorada + onda) y el
 * formulario debajo — para que la experiencia premium del inicio también viva
 * en el dispositivo principal.
 */
export default function AuthShell({
  children,
  headline,
  tagline,
}: AuthShellProps) {
  return (
    <div className="flex min-h-[100svh] flex-col lg:flex-row">
      {/* ============ Panel de marca — ESCRITORIO ============ */}
      <aside className="relative hidden overflow-hidden bg-verde text-arena lg:flex lg:w-[42%] lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: RADIAL }}
        />
        {/* Isotipo marca de agua */}
        <div className="pointer-events-none absolute -bottom-24 -left-16 text-verde-500/40">
          <Isotype size={520} />
        </div>
        {/* Estela dorada interactiva (mismo detalle que el inicio) */}
        <HeroFX className="z-[1]" />

        <div className="relative z-10 p-10">
          <Logo size={40} layout="horizontal" href="/" />
        </div>

        <div className="relative z-10 max-w-md p-10">
          <span className="rule-gold mb-8 w-20" />
          <h2 className="animate-rise font-display text-4xl leading-tight">
            {headline}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-beige">{tagline}</p>
          <p className="mt-10 font-display text-2xl italic text-dorado">
            Movimiento con Propósito.
          </p>
        </div>

        <div className="relative z-10 p-10 text-sm text-beige/70">
          Florencia · Caquetá — Studio Pilates
        </div>
      </aside>

      {/* ============ Contenido ============ */}
      <main className="relative flex flex-1 flex-col bg-arena">
        {/* Banda de marca — MÓVIL */}
        <div className="relative overflow-hidden bg-verde px-6 pt-10 pb-20 text-arena lg:hidden">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: RADIAL }}
          />
          <div className="pointer-events-none absolute -right-14 -top-10 text-verde-500/30">
            <Isotype size={220} />
          </div>
          <HeroFX className="z-[1]" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <Logo size={34} layout="horizontal" href="/" />
            <div className="mt-10 flex flex-col items-center">
              <span className="rule-gold mb-5 block w-16" />
              <h2 className="animate-rise font-display text-3xl leading-tight">
                {headline}
              </h2>
              <p className="mt-3 max-w-sm text-beige">{tagline}</p>
            </div>
          </div>

          {/* Onda orgánica que funde con el formulario */}
          <SectionWave fillClass="fill-arena" variant={2} />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10 lg:px-16">
          <div className="w-full max-w-md animate-rise">{children}</div>
        </div>

        <div className="p-6 text-center text-xs text-verde-300">
          <Link href="/" className="transition-colors hover:text-dorado-dark">
            ← Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  );
}
