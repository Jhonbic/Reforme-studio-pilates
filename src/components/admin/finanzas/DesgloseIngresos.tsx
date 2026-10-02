import Card from "@/components/admin/Card";
import CardHeader from "@/components/admin/CardHeader";
import { moneda, numero } from "@/lib/admin/format";
import type { Movimiento } from "@/lib/admin/types";

type Cobro = Extract<Movimiento, { tipo: "cobro" }>;

/**
 * «De dónde entra»: lo cobrado en el periodo, por plan.
 *
 * La barra hace comparable de un vistazo lo que la cifra sola no enseña: qué
 * plan sostiene el mes (idea de JainSportBox). Va `aria-hidden` porque el
 * porcentaje está escrito al lado — nunca se codifica solo con longitud.
 *
 * Un pago sin membresía (posible en la base) cae en «Sin plan» en vez de
 * desaparecer: si se perdiera, la suma de las filas no daría el total.
 */
export default function DesgloseIngresos({
  cobros,
  etiqueta,
  className = "",
}: {
  cobros: Cobro[];
  /** El periodo, para el mensaje de vacío. */
  etiqueta: string;
  className?: string;
}) {
  const total = cobros.reduce((t, c) => t + c.importe, 0);

  const porPlan = new Map<string, { cobros: number; importe: number }>();
  for (const c of cobros) {
    const plan = c.plan ?? "Sin plan";
    const fila = porPlan.get(plan) ?? { cobros: 0, importe: 0 };
    fila.cobros += 1;
    fila.importe += c.importe;
    porPlan.set(plan, fila);
  }
  const filas = [...porPlan].sort((a, b) => b[1].importe - a[1].importe);

  return (
    <Card className={className}>
      <CardHeader
        titulo="De dónde entra"
        descripcion="Lo cobrado en el periodo, por plan."
        accion={
          <span className="font-cifra text-lg font-normal text-verde">
            {moneda(total)}
          </span>
        }
      />

      {filas.length === 0 ? (
        <p className="mt-6 text-sm text-verde-300">
          No hubo cobros en {etiqueta}.
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {filas.map(([plan, f]) => {
            const pct = total ? (f.importe / total) * 100 : 0;
            return (
              <li key={plan}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-bold text-verde">
                    {plan}
                    <span className="ml-2 font-normal text-verde-300">
                      {numero(f.cobros)} {f.cobros === 1 ? "cobro" : "cobros"}
                    </span>
                  </span>
                  <span className="font-cifra shrink-0 font-normal text-verde-700">
                    {moneda(f.importe)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-3">
                  <div
                    aria-hidden="true"
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-beige/70"
                  >
                    <div
                      className="h-full rounded-full bg-[var(--color-chart-1)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-cifra w-12 text-right text-xs font-normal text-verde-300">
                    {Math.round(pct)} %
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
