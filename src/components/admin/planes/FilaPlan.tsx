import { moneda, numero, porcentaje } from "@/lib/admin/format";
import type { PlanConMetricas } from "@/lib/admin/types";

/** Cómo se dice la vigencia sin que parezca una cuenta de días. */
function vigencia(dias: number): string {
  if (dias === 1) return "El mismo día";
  if (dias % 30 === 0) {
    const meses = dias / 30;
    return meses === 1 ? "1 mes" : `${meses} meses`;
  }
  return `${numero(dias)} días`;
}

/**
 * Una modalidad del catálogo.
 *
 * Misma anatomía que las filas de Usuarios —un solo DOM que se apila en móvil y
 * se reparte en columnas en escritorio— pero **no es un enlace**: no hay ficha
 * de plan a la que ir, y una fila que parece pulsable y no lo es es peor que
 * una que no lo parece.
 */
export default function FilaPlan({
  plan,
  total,
}: {
  plan: PlanConMetricas;
  /** Facturación de todos los planes, para calcular el peso de este. */
  total: number;
}) {
  const peso = total ? (plan.facturacionMes / total) * 100 : 0;

  return (
    <div className="grid gap-x-4 gap-y-3 px-5 py-4 sm:px-6 md:grid-cols-[1fr_auto_auto_10rem] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg leading-tight text-verde">
            {plan.plan}
          </h3>
          {/* Un plan retirado conserva a sus clientes vigentes, así que sigue
              apareciendo: por eso hace falta decir que ya no se vende. */}
          {!plan.seVende && (
            <span className="rounded-full border border-beige bg-beige/40 px-2.5 py-1 text-xs text-verde-300">
              ○ No se vende
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-verde-300">{plan.descripcion}</p>
      </div>

      <div className="md:w-32 md:text-right">
        <p className="text-xs uppercase tracking-[0.14em] text-verde-300 md:hidden">
          Precio
        </p>
        <p className="font-display text-xl tabular-nums text-verde">
          {moneda(plan.precio)}
        </p>
        <p className="text-xs text-verde-300">
          {vigencia(plan.vigenciaDias)}
          {plan.clasesIncluidas !== null && (
            <>
              {" · "}
              {plan.clasesIncluidas}{" "}
              {plan.clasesIncluidas === 1 ? "clase" : "clases"}
            </>
          )}
        </p>
      </div>

      <div className="md:w-28 md:text-right">
        <p className="text-xs uppercase tracking-[0.14em] text-verde-300 md:hidden">
          Clientes
        </p>
        <p className="text-lg tabular-nums text-verde-700">
          {numero(plan.clientes)}
        </p>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.14em] text-verde-300">
            Factura
          </p>
          <p className="text-sm tabular-nums text-verde-700">
            {moneda(plan.facturacionMes)}
          </p>
        </div>
        {/* ⚠️ La barra es decoración del número, no el dato: va `aria-hidden`
            y el porcentaje se escribe al lado. Una barra sin cifra obligaría a
            estimar a ojo, y a un lector de pantalla no le dice nada. */}
        <div
          aria-hidden="true"
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-beige"
        >
          <div
            className="h-full rounded-full bg-dorado"
            style={{ width: `${peso}%` }}
          />
        </div>
        <p className="mt-1 text-xs tabular-nums text-verde-300">
          {porcentaje(peso, 0)} de lo facturado
        </p>
      </div>
    </div>
  );
}
