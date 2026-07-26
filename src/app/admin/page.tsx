import Card from "@/components/admin/Card";
import ChartCard from "@/components/admin/ChartCard";
import StatTile from "@/components/admin/StatTile";
import TarjetaIngresos from "@/components/admin/TarjetaIngresos";
import Variacion from "@/components/admin/Variacion";
import Donut from "@/components/admin/charts/Donut";
import GroupedBars from "@/components/admin/charts/GroupedBars";
import HBars from "@/components/admin/charts/HBars";
import { moneda, monedaCorta, numero, porcentaje } from "@/lib/admin/format";
import {
  getIndicadores,
  getMesesFinancieros,
  getMovimientoClientes,
  getRepartoMetodos,
  getRepartoPlanes,
  getTasaRenovacion,
} from "@/lib/admin/queries";

const C1 = "var(--color-chart-1)";
const C2 = "var(--color-chart-2)";
const C3 = "var(--color-chart-3)";
const C4 = "var(--color-chart-4)";

export default function DashboardPage() {
  const [ingresosMes, ...tiles] = getIndicadores();
  const meses = getMesesFinancieros();
  const planes = getRepartoPlanes();
  const metodos = getRepartoMetodos();
  const movimiento = getMovimientoClientes();
  const renovacion = getTasaRenovacion();

  const totalPlanes = planes.reduce((t, p) => t + p.importe, 0);
  const totalMetodos = metodos.reduce((t, m) => t + m.importe, 0);

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <h1 className="sr-only">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12 xl:gap-5">
        <section
          aria-label="Cifras principales"
          className="grid gap-4 sm:grid-cols-3 md:col-span-6 xl:col-span-12"
        >
          {tiles.map((i) => (
            <StatTile key={i.etiqueta} indicador={i} />
          ))}
        </section>

        <TarjetaIngresos
          indicador={ingresosMes}
          meses={meses}
          className="md:col-span-6 xl:col-span-8"
        />

        <ChartCard
          titulo="Ingresos por tipo de plan"
          className="md:col-span-6 xl:col-span-4"
          tabla={{
            cabeceras: ["Plan", "Clientes", "Importe"],
            filas: planes.map((p) => [
              p.plan,
              numero(p.clientes),
              moneda(p.importe),
            ]),
          }}
        >
          <Donut
            totalEtiqueta="Facturado"
            totalValor={monedaCorta(totalPlanes)}
            formato="moneda"
            datos={[
              { label: planes[0].plan, value: planes[0].importe, color: C1 },
              { label: planes[1].plan, value: planes[1].importe, color: C2 },
              { label: planes[2].plan, value: planes[2].importe, color: C3 },
              { label: planes[3].plan, value: planes[3].importe, color: C4 },
            ]}
          />
        </ChartCard>

        <Card
          tono="oscuro"
          fx
          className="flex flex-col justify-center md:col-span-3 xl:col-span-4"
        >
          <h2 className="font-display text-xl text-arena">
            Tasa de renovación
          </h2>
          <p className="mt-6 font-display text-5xl tabular-nums leading-none text-arena xl:text-6xl">
            {porcentaje(renovacion.valor)}
          </p>
          {renovacion.variacion !== null && (
            <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm">
              <Variacion valor={renovacion.variacion} tono="oscuro" />
              <span className="text-beige/75">frente al mes anterior</span>
            </p>
          )}
        </Card>

        <ChartCard
          titulo="Cómo pagan los clientes"
          className="md:col-span-3 xl:col-span-4"
          tabla={{
            cabeceras: ["Método", "Importe", "% del total"],
            filas: metodos.map((m) => [
              m.metodo,
              moneda(m.importe),
              porcentaje((m.importe / totalMetodos) * 100, 0),
            ]),
          }}
        >
          <HBars
            datos={metodos.map((m) => ({ label: m.metodo, value: m.importe }))}
            color={C1}
            formatoValor={moneda}
          />
        </ChartCard>

        <ChartCard
          titulo="Altas y bajas por mes"
          className="md:col-span-6 xl:col-span-4"
          tabla={{
            cabeceras: ["Mes", "Altas", "Bajas", "Neto"],
            filas: movimiento.map((m) => [
              m.mes,
              m.altas,
              m.bajas,
              `${m.altas - m.bajas > 0 ? "+" : ""}${m.altas - m.bajas}`,
            ]),
          }}
        >
          <GroupedBars
            datos={movimiento.map((m) => ({
              label: m.mes,
              valores: [m.altas, m.bajas],
            }))}
            series={[
              { nombre: "Altas", color: C1 },
              { nombre: "Bajas", color: C3 },
            ]}
            formato="clientes"
            formatoEje="numero"
          />
        </ChartCard>
      </div>
    </div>
  );
}
