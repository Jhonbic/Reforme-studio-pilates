import Link from "next/link";
import HeroFX from "@/components/fx/HeroFX";
import { fecha as fechaCorta } from "@/lib/admin/format";
import type { MiCuenta } from "@/lib/cliente/datos";
import { vigenciaPlan } from "@/lib/cliente/inicio";
import { WHATSAPP_ESTUDIO } from "@/lib/contacto";

const BOTON =
  "inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-sm font-medium transition-colors duration-300";

/** «en 7 días», «mañana», «hoy». */
function enDias(n: number): string {
  if (n <= 0) return "hoy";
  if (n === 1) return "mañana";
  return `en ${n} días`;
}

/**
 * La tarjeta del plan del Inicio de `/mi-cuenta`: verde de marca con las motas
 * de la barra lateral (`HeroFX`, sin goteo), como las tarjetas oscuras del
 * panel. Es el ancla visual de la pantalla.
 *
 * Con plan: cuántas clases le quedan de cada modalidad (con barra) y cuánto
 * le queda de vigencia. Si pagó un plan que aún no empieza, lo dice («Empieza
 * el 15 nov»): antes salía «Vigente hasta…» y ninguna clase.
 *
 * Sin plan, vencido o de baja: el porqué y adónde ir, en la misma tarjeta.
 *
 * Las barras van `aria-hidden`: la cifra está escrita al lado. Ningún dato va
 * solo con color.
 */
export default function TarjetaPlan({
  cuenta,
  conPlan,
  hoy,
}: {
  cuenta: MiCuenta;
  conPlan: boolean;
  hoy: string;
}) {
  const vigencia = conPlan ? vigenciaPlan(cuenta.inicio, cuenta.vencimiento, hoy) : null;

  const estado =
    vigencia?.tipo === "por-empezar"
      ? { simbolo: "◇", texto: `Empieza ${enDias(vigencia.diasParaEmpezar)}` }
      : vigencia?.tipo === "en-curso" && vigencia.diasRestantes <= 7
        ? { simbolo: "▲", texto: vigencia.diasRestantes === 0 ? "Vence hoy" : `Vence ${enDias(vigencia.diasRestantes)}` }
        : { simbolo: "●", texto: "Activo" };
  const porVencer = vigencia?.tipo === "en-curso" && vigencia.diasRestantes <= 7;

  return (
    <section
      aria-labelledby="tu-plan"
      className="relative isolate overflow-hidden rounded-3xl bg-verde p-6 text-arena shadow-lift sm:p-7"
    >
      <HeroFX className="-z-10" goteo={false} />

      {conPlan ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow text-dorado-light">Tu plan</p>
              <h2 id="tu-plan" className="mt-2 font-display text-3xl leading-tight sm:text-4xl">
                {cuenta.plan}
              </h2>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-dorado-light/50 px-3 py-1 text-xs text-dorado-light">
              <span aria-hidden="true">{estado.simbolo}</span>
              {estado.texto}
            </span>
          </div>

          {/* Cuántas le quedan de cada modalidad: cada reserva descuenta una,
              y cancelar dentro del plazo la devuelve. */}
          {cuenta.saldo.length > 0 && (
            <ul className="mt-6 space-y-4">
              {cuenta.saldo.map((s) => (
                <li key={s.tipo}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-beige">{s.tipo}</span>
                    <span className="text-beige/80">
                      <strong className="font-cifra text-xl font-light text-arena">{s.quedan}</strong> de{" "}
                      {s.total} {s.total === 1 ? "clase" : "clases"}
                    </span>
                  </div>
                  <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-verde-900/70">
                    <div
                      className="h-full rounded-full bg-dorado-light transition-[width] duration-700"
                      style={{ width: `${s.total > 0 ? (s.quedan / s.total) * 100 : 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-verde-700/80 pt-4 text-sm">
            <p className="text-beige/90">
              {vigencia?.tipo === "por-empezar" && cuenta.inicio ? (
                <>
                  Del <span className="text-arena">{fechaCorta(cuenta.inicio)}</span> al{" "}
                  <span className="text-arena">{fechaCorta(cuenta.vencimiento ?? cuenta.inicio)}</span>
                </>
              ) : (
                <>
                  Hasta el{" "}
                  <span className="text-arena">
                    {cuenta.vencimiento ? fechaCorta(cuenta.vencimiento, true) : "—"}
                  </span>
                  {vigencia?.tipo === "en-curso" && vigencia.diasRestantes > 7 && (
                    <> · quedan {vigencia.diasRestantes} días</>
                  )}
                </>
              )}
            </p>
            <Link
              href="/mi-cuenta/planes"
              className={`group inline-flex min-h-[44px] items-center gap-1 text-dorado-light transition-colors hover:text-arena ${
                porVencer ? "font-medium" : ""
              }`}
            >
              {porVencer ? "Renovar" : "Ver planes"}
              <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          </div>

          {/* Días consumidos del plan: solo cuando ya está en curso. */}
          {vigencia?.tipo === "en-curso" && (
            <div aria-hidden="true" className="mt-1 h-1 overflow-hidden rounded-full bg-verde-900/70">
              <div
                className="h-full rounded-full bg-beige/50"
                style={{ width: `${vigencia.transcurrido * 100}%` }}
              />
            </div>
          )}
        </>
      ) : (
        /* Sin plan no se puede reservar (decisión del usuario). Se dice aquí,
           arriba, y no solo al pulsar «Reservar». */
        <>
          <p className="eyebrow text-dorado-light">Tu plan</p>
          <h2 id="tu-plan" className="mt-2 font-display text-3xl leading-tight">
            {cuenta.estado === "Vencida"
              ? "Tu plan venció"
              : cuenta.estado === "De baja"
                ? "Tu cuenta está inactiva"
                : "Aún no tienes un plan"}
          </h2>
          <p className="mt-2 max-w-md text-sm text-beige/90">
            {cuenta.estado === "De baja"
              ? "Escríbenos o pasa por recepción y la volvemos a activar."
              : cuenta.estado === "Vencida" && cuenta.vencimiento
                ? `Terminó el ${fechaCorta(cuenta.vencimiento, true)}. Renuévalo para volver a reservar tus clases.`
                : "Para reservar necesitas un plan vigente. Actívalo en recepción o escríbenos y te ayudamos."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {cuenta.estado !== "De baja" && (
              <Link href="/mi-cuenta/planes" className={`${BOTON} bg-dorado text-verde-900 hover:bg-dorado-light`}>
                Ver los planes
              </Link>
            )}
            <a
              href={WHATSAPP_ESTUDIO}
              target="_blank"
              rel="noopener noreferrer"
              className={`${BOTON} border border-beige/40 text-arena hover:border-dorado-light`}
            >
              Escribir por WhatsApp
            </a>
          </div>
        </>
      )}
    </section>
  );
}
