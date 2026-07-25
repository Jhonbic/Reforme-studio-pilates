import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import Parallax from "@/components/Parallax";
import SectionWave from "@/components/SectionWave";
import HeroFX from "@/components/fx/HeroFX";
import Magnetic from "@/components/fx/Magnetic";
import { Isotype } from "@/components/Logo";
import { ButtonLink } from "@/components/ui/Button";
import {
  IconAltaCalidad,
  IconBienestar,
  IconPersonalizado,
} from "@/components/icons/PilarIcons";

const pilares = [
  {
    title: "Personalizado",
    text: "Sesiones pensadas para tu cuerpo y tus objetivos. Grupos reducidos y acompañamiento cercano en cada movimiento.",
    Icon: IconPersonalizado,
  },
  {
    title: "Alta Calidad",
    text: "Equipos de reformer premium y un entorno diseñado con detalle para que cada práctica se sienta como un ritual.",
    Icon: IconAltaCalidad,
  },
  {
    title: "Bienestar Integral",
    text: "Un enfoque consciente que une fuerza, respiración y calma para cuidar tu bienestar físico y emocional.",
    Icon: IconBienestar,
  },
];

export default function Home() {
  return (
    <>
      <Navbar />

      <main>
        {/* ============ HERO ============ */}
        <section className="relative flex min-h-[100svh] items-center overflow-hidden bg-verde text-arena">
          {/* Fondo: profundidad radial + isotipo marca de agua */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 90% at 70% 10%, #2f5040 0%, #284435 45%, #1b2f24 100%)",
            }}
          />

          {/* Capa interactiva: polvo dorado + burbujas al cursor + goteo al clic */}
          <HeroFX className="z-10" />

          <div className="relative z-20 mx-auto w-full max-w-7xl px-6 pt-32 pb-32 lg:px-10">
            <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
              {/* Logo oficial — en móvil encabeza el hero; en escritorio, a la derecha */}
              <div className="order-1 flex justify-center lg:order-2 lg:justify-end">
                <Image
                  src="/logo-reforme.png"
                  alt="Reforme Studio Pilates"
                  width={554}
                  height={328}
                  priority
                  className="logo-float w-52 max-w-full sm:w-64 lg:w-[24rem]"
                  /* El PNG trae el trazo en verde: lo pasamos a blanco puro para
                     que contraste sobre el hero. Inline y no con utilidades de
                     Tailwind porque `filter` es una sola propiedad y las clases
                     de brillo/inversión no se estaban combinando con drop-shadow. */
                  style={{
                    filter:
                      "brightness(0) invert(1) drop-shadow(0 4px 20px rgba(0,0,0,0.35))",
                  }}
                />
              </div>

              {/* Texto */}
              <div className="order-2 text-center lg:order-1 lg:text-left">
                <p className="eyebrow animate-fade text-dorado-light">
                  Florencia · Caquetá — Studio Pilates
                </p>
                <h1 className="animate-rise mt-6 font-display text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
                  Movimiento con
                  <span className="mt-1 block italic text-dorado">
                    Propósito.
                  </span>
                </h1>
                <p
                  className="animate-rise mx-auto mt-8 max-w-xl text-lg leading-relaxed text-beige lg:mx-0"
                  style={{ animationDelay: "120ms" }}
                >
                  Un espacio creado para vivir el Pilates a través de una
                  experiencia elegante y personalizada, enfocada en tu bienestar
                  integral.
                </p>
                <div
                  className="animate-rise mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-4 lg:justify-start"
                  style={{ animationDelay: "220ms" }}
                >
                  <Magnetic className="w-full sm:w-auto">
                    <ButtonLink
                      href="/registro"
                      variant="gold"
                      size="lg"
                      className="w-full justify-center sm:w-auto"
                    >
                      Reservar mi clase
                    </ButtonLink>
                  </Magnetic>
                  <ButtonLink
                    href="/#estudio"
                    variant="ghost"
                    size="lg"
                    className="w-full justify-center text-arena hover:text-dorado sm:w-auto"
                  >
                    Conocer el estudio →
                  </ButtonLink>
                </div>
              </div>
            </div>
          </div>

          <SectionWave fillClass="fill-arena" variant={1} />
        </section>

        {/* ============ EL ESTUDIO ============ */}
        <section
          id="estudio"
          className="relative overflow-hidden bg-arena pt-28 pb-28 lg:pt-36 lg:pb-40"
        >
          <div className="relative z-20 mx-auto max-w-7xl px-6 lg:px-10">
            <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
              <Reveal direction="left" className="text-center lg:text-left">
                <p className="eyebrow text-dorado-dark">El estudio</p>
                <h2 className="mt-5 font-display text-4xl leading-tight text-verde sm:text-5xl">
                  Un Pilates consciente, hecho a tu medida.
                </h2>
                <p className="mt-6 text-lg leading-relaxed text-verde-700">
                  En Reforme creemos que moverse es reconectar. Cada sesión es un
                  espacio para escuchar tu cuerpo, ganar fuerza y encontrar
                  equilibrio, guiada por profesionales que cuidan cada detalle.
                </p>
                <p className="mt-4 text-lg leading-relaxed text-verde-700">
                  Nuestra misión es acompañarte hacia tu bienestar físico y
                  emocional. Nuestra visión, convertirnos en el estudio de
                  referencia de la región.
                </p>
                <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
                  <span className="rule-gold w-16" />
                  <span className="font-display text-xl italic text-dorado-dark">
                    Movimiento con Propósito
                  </span>
                </div>
              </Reveal>

              {/* Tarjeta editorial con degradado de marca */}
              <Reveal delay={150} direction="right">
                <Parallax speed={-0.08}>
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-lift">
                    <div className="brand-gradient absolute inset-0" />
                    {/* Estela dorada dentro del cuadro */}
                    <HeroFX className="z-[1]" />
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 p-10 text-center text-arena">
                      <Isotype size={130} className="text-arena/90" />
                      <p className="font-display text-3xl italic">
                        Equilibrio, fluidez y movimiento.
                      </p>
                      <span className="rule-gold w-24 opacity-70" />
                      <p className="max-w-xs text-sm leading-relaxed text-beige">
                        Un ambiente sereno, luz cálida y equipos premium
                        diseñados para que cada práctica se sienta única.
                      </p>
                    </div>
                  </div>
                </Parallax>
              </Reveal>
            </div>
          </div>

          <SectionWave fillClass="fill-beige" variant={2} />
        </section>

        {/* ============ EXPERIENCIA / PILARES ============ */}
        <section
          id="experiencia"
          className="relative overflow-hidden bg-beige pt-28 pb-28 lg:pt-36 lg:pb-40"
        >
          <div className="relative z-20 mx-auto max-w-7xl px-6 lg:px-10">
            <Reveal className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
              <p className="eyebrow text-dorado-dark">La experiencia Reforme</p>
              <h2 className="mt-5 font-display text-4xl leading-tight text-verde sm:text-5xl">
                Tres pilares que definen cada sesión.
              </h2>
            </Reveal>

            <div className="mt-16 grid gap-6 md:grid-cols-3">
              {pilares.map((p, i) => (
                <Reveal
                  key={p.title}
                  delay={i * 120}
                  as="article"
                  className="group relative flex flex-col items-center overflow-hidden rounded-3xl bg-arena p-9 text-center shadow-soft transition-all duration-500 hover:-translate-y-1 hover:shadow-lift md:items-start md:text-left"
                >
                  <span className="card-sheen" aria-hidden="true" />
                  <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border border-dorado/30 bg-dorado/10 text-dorado-dark transition-all duration-500 group-hover:border-dorado group-hover:bg-dorado group-hover:text-arena">
                    <p.Icon size={30} />
                  </span>
                  <span className="relative z-10 mt-6 rule-gold w-10 transition-all duration-500 group-hover:w-16" />
                  <h3 className="relative z-10 mt-6 font-display text-2xl text-verde">
                    {p.title}
                  </h3>
                  <p className="relative z-10 mt-3 leading-relaxed text-verde-700">
                    {p.text}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>

          <SectionWave fillClass="fill-verde" variant={1} />
        </section>

        {/* ============ CTA MEMBRESÍA ============ */}
        <section className="relative overflow-hidden bg-verde pt-28 pb-28 text-arena lg:pt-36 lg:pb-40">
          <Parallax
            speed={0.18}
            className="pointer-events-none absolute -left-20 -top-10 text-verde-500/30"
          >
            <Isotype size={420} />
          </Parallax>
          <Parallax
            speed={-0.14}
            className="pointer-events-none absolute -right-16 bottom-0 text-verde-700/40"
          >
            <Isotype size={300} />
          </Parallax>

          {/* Estela dorada también sobre esta sección verde */}
          <HeroFX className="z-10" />

          <div className="relative z-20 mx-auto max-w-3xl px-6 text-center lg:px-10">
            <Reveal>
              <p className="eyebrow text-dorado-light">Tu práctica te espera</p>
              <h2 className="mt-5 font-display text-4xl leading-tight sm:text-5xl">
                Reserva tu clase en segundos.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-beige">
                Crea tu cuenta para reservar tus sesiones, gestionar tu agenda y
                vivir la experiencia Reforme a tu ritmo.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Magnetic>
                  <ButtonLink href="/registro" variant="gold" size="lg">
                    Crear mi cuenta
                  </ButtonLink>
                </Magnetic>
                <ButtonLink href="/login" variant="outlineLight" size="lg">
                  Ya tengo cuenta
                </ButtonLink>
              </div>
            </Reveal>
          </div>

          <SectionWave fillClass="fill-arena" variant={2} />
        </section>

        {/* ============ UBICACIÓN ============ */}
        <section
          id="ubicacion"
          className="relative overflow-hidden bg-arena pt-28 pb-28 lg:pt-36 lg:pb-40"
        >
          <div className="relative z-20 mx-auto max-w-7xl px-6 lg:px-10">
            <div className="grid gap-14 lg:grid-cols-2 lg:gap-16">
              <Reveal direction="left" className="text-center lg:text-left">
                <p className="eyebrow text-dorado-dark">Ubicación</p>
                <h2 className="mt-5 font-display text-4xl leading-tight text-verde sm:text-5xl">
                  Te esperamos en Florencia.
                </h2>
                <p className="mt-6 text-lg leading-relaxed text-verde-700">
                  Un espacio pensado para desconectar del ritmo de la ciudad y
                  reconectar contigo. Fácil de encontrar, en el corazón de
                  Multiplaza Chaira.
                </p>

                <dl className="mt-10 space-y-6">
                  <div className="flex flex-col items-center gap-2 lg:flex-row lg:items-start lg:gap-4">
                    <span className="text-dorado lg:mt-1">◆</span>
                    <div>
                      <dt className="eyebrow text-verde-300">Dirección</dt>
                      <dd className="mt-1 text-lg text-verde">
                        Carrera 1 #27-50, Multiplaza Chaira
                      </dd>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2 lg:flex-row lg:items-start lg:gap-4">
                    <span className="text-dorado lg:mt-1">◆</span>
                    <div>
                      <dt className="eyebrow text-verde-300">Teléfono</dt>
                      <dd className="mt-1 text-lg text-verde">
                        <a
                          href="tel:+573209078814"
                          className="transition-colors hover:text-dorado-dark"
                        >
                          +57 320 9078814
                        </a>
                      </dd>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2 lg:flex-row lg:items-start lg:gap-4">
                    <span className="text-dorado lg:mt-1">◆</span>
                    <div>
                      <dt className="eyebrow text-verde-300">Reservas</dt>
                      <dd className="mt-1 text-lg text-verde">
                        Agenda tu clase desde tu cuenta
                      </dd>
                    </div>
                  </div>
                </dl>
              </Reveal>

              <Reveal delay={150} direction="right">
                <div className="h-full min-h-[380px] overflow-hidden rounded-[2rem] shadow-lift">
                  <iframe
                    title="Ubicación de Reforme Studio Pilates"
                    src="https://www.google.com/maps?q=Multiplaza+Chaira+Florencia+Caqueta&output=embed"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="h-full w-full border-0 grayscale-[0.2]"
                  />
                </div>
              </Reveal>
            </div>
          </div>

          <SectionWave fillClass="fill-verde" variant={1} />
        </section>
      </main>

      <Footer />
    </>
  );
}
