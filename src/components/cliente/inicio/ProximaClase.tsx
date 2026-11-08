import Link from "next/link";
import type { ReactNode } from "react";
import { diaCorto, diaRelativo, numeroDia } from "@/lib/admin/horario";
import type { ClaseParaCliente } from "@/lib/cliente/datos";
import { faltaPara } from "@/lib/cliente/inicio";

/**
 * «Tu próxima clase»: la primera reserva, en grande, porque es lo que se
 * viene a mirar («¿a qué hora era?»). Las acciones (Cambiar / Cancelar, o por
 * qué ya no se puede) llegan hechas desde `PanelCliente`, que es donde viven
 * el estado y el aviso de las acciones.
 *
 * Sin reservas, un estado vacío que lleva a reservar (si tiene plan).
 */
export default function ProximaClase({
  clase,
  hoy,
  ahoraMin,
  conPlan,
  acciones,
}: {
  clase: ClaseParaCliente | undefined;
  hoy: string;
  ahoraMin: number;
  conPlan: boolean;
  acciones: ReactNode;
}) {
  if (!clase) {
    return (
      <section
        aria-labelledby="proxima-clase"
        className="rounded-3xl border border-dashed border-dorado/60 bg-white/70 p-6 text-center"
      >
        <h2 id="proxima-clase" className="font-display text-2xl text-verde">
          Sin clases reservadas
        </h2>
        <p className="mx-auto mt-1 max-w-xs text-sm text-verde-700">
          {conPlan
            ? "Elige tu próxima clase: los cupos se llenan rápido."
            : "Cuando tengas un plan, aquí verás tu próxima clase."}
        </p>
        {conPlan && (
          <Link
            href="/mi-cuenta/reservar"
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-full bg-dorado px-6 text-sm font-medium text-verde-900 transition-colors duration-300 hover:bg-dorado-dark"
          >
            Reservar una clase
          </Link>
        )}
      </section>
    );
  }

  const falta = faltaPara(clase, hoy, ahoraMin);

  return (
    <section aria-labelledby="proxima-clase" className="rounded-3xl border border-beige bg-white p-5 shadow-soft sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="proxima-clase" className="eyebrow text-dorado-tinta">
          Tu próxima clase
        </h2>
        {falta && (
          <span className="rounded-full bg-dorado/15 px-3 py-1 text-xs font-medium text-verde">{falta}</span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4">
        {/* El día en una ficha, como una hoja de calendario: se reconoce de un
            vistazo. El texto completo va al lado. */}
        <div
          aria-hidden="true"
          className="flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl border border-beige bg-arena"
        >
          <span className="text-[11px] uppercase tracking-wider text-dorado-tinta">{diaCorto(clase.fecha)}</span>
          <span className="font-cifra text-2xl font-light leading-none text-verde">{numeroDia(clase.fecha)}</span>
        </div>
        <div className="min-w-0">
          <p className="font-display text-2xl leading-tight text-verde first-letter:uppercase">
            {diaRelativo(clase.fecha, hoy)}
          </p>
          <p className="font-cifra text-lg font-normal text-verde">
            {clase.horaInicio} <span className="text-verde-300">→ {clase.horaFin}</span>
          </p>
          <p className="truncate text-sm text-verde-700">
            {clase.tipo} · con {clase.instructora}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-beige pt-4">{acciones}</div>
    </section>
  );
}
