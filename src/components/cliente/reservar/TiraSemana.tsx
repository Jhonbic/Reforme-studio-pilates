import { fecha as fechaCorta } from "@/lib/admin/format";
import { diaCorto, diaRelativo, numeroDia, sumarDias } from "@/lib/admin/horario";
import { diasDeSemana } from "@/lib/cliente/reservar";

const FLECHA =
  "inline-flex size-11 items-center justify-center rounded-full border border-beige bg-white text-verde transition-colors duration-300 hover:border-dorado disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-beige focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado";

/** «16 – 22 nov», o «30 nov – 6 dic» si la semana cruza de mes. */
function rotuloSemana(lunes: string): string {
  const domingo = sumarDias(lunes, 6);
  if (lunes.slice(0, 7) === domingo.slice(0, 7)) return `${numeroDia(lunes)} – ${fechaCorta(domingo)}`;
  return `${fechaCorta(lunes)} – ${fechaCorta(domingo)}`;
}

/**
 * La semana que se está mirando, con flechas para pasar a la anterior o la
 * siguiente (solo las que trae la agenda), y en el MÓVIL los siete días para
 * elegir uno. En escritorio los días no hacen falta: la tabla enseña la
 * semana entera.
 *
 * Cada día dice cuántas clases puede reservar (raya si ninguna) y un ✓ si
 * tiene alguna suya. Los días que ya pasaron se ven apagados y no se pulsan.
 */
export default function TiraSemana({
  lunes,
  semanas,
  dia,
  hoy,
  reservables,
  suyas,
  onSemana,
  onDia,
}: {
  lunes: string;
  semanas: string[];
  dia: string;
  hoy: string;
  /** Clases que puede reservar (o pedir en espera) cada día. */
  reservables: Record<string, number>;
  /** Días en los que ya tiene alguna clase. */
  suyas: Set<string>;
  onSemana: (lunes: string) => void;
  onDia: (dia: string) => void;
}) {
  const i = semanas.indexOf(lunes);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className={FLECHA}
          disabled={i <= 0}
          onClick={() => onSemana(semanas[i - 1])}
          aria-label="Semana anterior"
        >
          <span aria-hidden="true">‹</span>
        </button>
        <p aria-live="polite" className="font-display text-2xl text-verde">
          {rotuloSemana(lunes)}
        </p>
        <button
          type="button"
          className={FLECHA}
          disabled={i < 0 || i >= semanas.length - 1}
          onClick={() => onSemana(semanas[i + 1])}
          aria-label="Semana siguiente"
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>

      {/* Siete botones a 390 px salen a ~50 px: caben sin scroll lateral. */}
      <div role="group" aria-label="Elegir día" className="grid grid-cols-7 gap-1.5 lg:hidden">
        {diasDeSemana(lunes).map((d) => {
          const activo = d === dia;
          const pasado = d < hoy;
          const n = reservables[d] ?? 0;
          const mia = suyas.has(d);
          return (
            <button
              key={d}
              type="button"
              disabled={pasado}
              aria-pressed={activo}
              onClick={() => onDia(d)}
              aria-label={`${diaRelativo(d, hoy)}: ${
                n === 0 ? "ninguna clase para reservar" : `${n} ${n === 1 ? "clase" : "clases"} para reservar`
              }${mia ? ", tienes clase" : ""}`}
              className={`flex min-h-[68px] flex-col items-center justify-center gap-0.5 rounded-2xl border transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${
                activo
                  ? "border-verde bg-verde text-arena"
                  : `${d === hoy ? "border-dorado" : "border-beige"} bg-white text-verde-700 enabled:hover:border-dorado`
              }`}
            >
              <span aria-hidden="true" className={`text-[11px] uppercase ${activo ? "text-beige" : "text-verde-300"}`}>
                {diaCorto(d)}
              </span>
              <span aria-hidden="true" className="font-cifra text-lg font-normal leading-none">
                {numeroDia(d)}
              </span>
              <span
                aria-hidden="true"
                className={`text-[11px] tabular-nums ${activo ? "text-dorado-light" : n === 0 ? "text-verde-300/60" : "text-dorado-tinta"}`}
              >
                {mia ? "✓" : n === 0 ? "–" : n}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
