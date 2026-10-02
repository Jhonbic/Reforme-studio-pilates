import Card from "@/components/admin/Card";
import CardHeader from "@/components/admin/CardHeader";
import Pastilla, { TONO_ESTADO } from "@/components/admin/Pastilla";
import { moneda } from "@/lib/admin/format";
import type { CategoriaGasto, Movimiento } from "@/lib/admin/types";

type Gasto = Extract<Movimiento, { tipo: "gasto" }>;

/**
 * «A dónde se va»: lo gastado en el periodo, por categoría y **frente a lo
 * presupuestado**.
 *
 * Es lo que esta pantalla añade sobre la de JainSportBox: la tabla
 * `presupuestos` existía en la base y ninguna pantalla la leía. No basta con
 * saber cuánto se gastó; la pregunta de Finanzas es si se gastó lo previsto.
 *
 * ⚠️ El presupuesto que se compara es la **suma de los meses que toca el
 * periodo**. En el mes en curso se compara lo gastado hasta hoy con el
 * presupuesto del mes entero: es justo lo que se quiere saber («llevamos el
 * 60 %»). En un rango que corta meses por la mitad la comparación es
 * aproximada, porque los presupuestos son mensuales.
 *
 * Pasarse se dice con símbolo y texto (`▲ +4 %`), no solo con el rojo de la
 * barra. Misma regla que `Variacion` y las pastillas de estado.
 */
export default function DesgloseGastos({
  gastos,
  presupuesto,
  etiqueta,
  className = "",
}: {
  gastos: Gasto[];
  /** Presupuesto por categoría, ya sumado para los meses del periodo. */
  presupuesto: Map<CategoriaGasto, number>;
  etiqueta: string;
  className?: string;
}) {
  const gastado = new Map<CategoriaGasto, number>();
  for (const g of gastos) {
    gastado.set(g.categoria, (gastado.get(g.categoria) ?? 0) + g.importe);
  }

  // Salen las categorías con gasto O con presupuesto: una categoría
  // presupuestada en la que no se ha gastado nada también es información.
  const categorias = [...new Set([...gastado.keys(), ...presupuesto.keys()])]
    .map((c) => ({
      categoria: c,
      gastado: gastado.get(c) ?? 0,
      previsto: presupuesto.get(c) ?? 0,
    }))
    .sort((a, b) => b.gastado - a.gastado);

  const totalGastado = gastos.reduce((t, g) => t + g.importe, 0);
  const totalPrevisto = [...presupuesto.values()].reduce((t, v) => t + v, 0);
  const pasadas = categorias.filter(
    (c) => c.previsto > 0 && c.gastado > c.previsto,
  ).length;

  return (
    <Card className={className}>
      <CardHeader
        titulo="A dónde se va"
        descripcion={
          totalPrevisto
            ? `${Math.round((totalGastado / totalPrevisto) * 100)} % del presupuesto usado · ${
                pasadas === 0
                  ? "ninguna categoría por encima"
                  : pasadas === 1
                    ? "1 categoría por encima"
                    : `${pasadas} categorías por encima`
              }`
            : "Lo gastado en el periodo, por categoría."
        }
        accion={
          <span className="font-cifra text-lg font-normal text-verde">
            {moneda(totalGastado)}
          </span>
        }
      />

      {categorias.length === 0 ? (
        <p className="mt-6 text-sm text-verde-300">
          No hubo gastos en {etiqueta}.
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {categorias.map((c) => {
            const pct = c.previsto ? (c.gastado / c.previsto) * 100 : 0;
            const pasada = c.previsto > 0 && c.gastado > c.previsto;
            return (
              <li key={c.categoria}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
                  <span className="font-bold text-verde">{c.categoria}</span>
                  <span className="font-cifra font-normal text-verde-700">
                    {moneda(c.gastado)}
                    <span className="text-verde-300">
                      {c.previsto
                        ? ` de ${moneda(c.previsto)}`
                        : " · sin presupuesto"}
                    </span>
                  </span>
                </div>
                {c.previsto > 0 && (
                  <div className="mt-1.5 flex items-center gap-3">
                    <div
                      aria-hidden="true"
                      className="h-1.5 flex-1 overflow-hidden rounded-full bg-beige/70"
                    >
                      <div
                        className={`h-full rounded-full ${
                          pasada
                            ? "bg-[var(--color-estado-grave)]"
                            : "bg-[var(--color-chart-1)]"
                        }`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    {pasada ? (
                      <Pastilla
                        simbolo="▲"
                        texto={`+${Math.round(pct - 100)} %`}
                        clase={TONO_ESTADO.grave}
                      />
                    ) : (
                      <span className="font-cifra w-12 text-right text-xs font-normal text-verde-300">
                        {Math.round(pct)} %
                      </span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
