import Card from "@/components/admin/Card";
import CardHeader from "@/components/admin/CardHeader";
import ChartCard from "@/components/admin/ChartCard";
import StatTile from "@/components/admin/StatTile";
import GroupedBars from "@/components/admin/charts/GroupedBars";
import HBars from "@/components/admin/charts/HBars";
import Cartera from "@/components/admin/finanzas/Cartera";
import UltimosPagos from "@/components/admin/finanzas/UltimosPagos";
import { moneda } from "@/lib/admin/format";
import {
  getCartera,
  getGastos,
  getIndicadoresFinanzas,
  getMesesFinancieros,
  getUltimosPagos,
} from "@/lib/admin/queries";

const C1 = "var(--color-chart-1)";
const C2 = "var(--color-chart-2)";

/** Lo que se ha hablado que llevará esta sección, para no perder el hilo. */
/* Lo que sigue faltando. Se han ido dos de la lista original: el libro de
   ingresos (ahora «Últimos pagos») y la cartera detallada. Lo que queda tiene
   algo en común: todo pide ESCRIBIR —registrar un gasto, cerrar la caja,
   guardar un comprobante—, y eso no se puede hacer sin base de datos. */
const PREVISTO = [
  "Registrar gastos a mano, con su comprobante adjunto",
  "Cierre de caja diario: cuadrar el efectivo contra lo digital",
  "Libro completo con filtros por periodo, cliente y método",
  "Exportación a Excel para la contadora",
  "Presupuesto anual, no solo el del mes en curso",
];

/**
 * Finanzas.
 *
 * Aquí bajaron "Ingresos frente a gastos" y "Gastos por categoría": son detalle
 * contable, no resumen de negocio, y en el Dashboard competían con las cifras
 * de cabecera. A diferencia del Dashboard, esta pantalla SÍ conserva las
 * descripciones: es donde se entra a mirar el dato despacio.
 */
export default function FinanzasPage() {
  const meses = getMesesFinancieros();
  const gastos = getGastos();
  const indicadores = getIndicadoresFinanzas();
  const pagos = getUltimosPagos(8);
  const cartera = getCartera();

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <h1 className="sr-only">Finanzas</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12 xl:gap-5">
        {/* ⚠️ La pantalla abría directamente con un gráfico de doce meses. Para
            saber cómo fue ESTE mes había que leer la última pareja de barras
            —o abrir la tabla— cuando es justo lo primero que se viene a mirar.
            Las cuatro cifras responden eso antes de que nadie interprete nada.

            Reutilizan `StatTile`, el mismo componente del Dashboard: son el
            mismo objeto (cifra + variación + detalle) y duplicarlo habría hecho
            que las dos pantallas se separaran con el primer retoque. */}
        <section
          aria-label="Cifras del mes"
          className="grid gap-4 sm:grid-cols-2 md:col-span-6 xl:col-span-12 xl:grid-cols-4"
        >
          {indicadores.map((i) => (
            <StatTile key={i.etiqueta} indicador={i} />
          ))}
        </section>

        <ChartCard
          titulo="Ingresos frente a gastos"
          descripcion="Las dos series comparten un mismo eje en pesos. La distancia entre barras es la utilidad del mes."
          className="md:col-span-6 xl:col-span-8"
          tabla={{
            cabeceras: ["Mes", "Ingresos", "Gastos", "Utilidad"],
            filas: meses.map((m) => [
              `${m.mes} ${m.anio}`,
              moneda(m.ingresos),
              moneda(m.gastos),
              moneda(m.ingresos - m.gastos),
            ]),
          }}
        >
          <GroupedBars
            datos={meses.map((m) => ({
              label: m.mes,
              valores: [m.ingresos, m.gastos],
            }))}
            series={[
              { nombre: "Ingresos", color: C1 },
              { nombre: "Gastos", color: C2 },
            ]}
            formato="moneda"
          />
        </ChartCard>

        {/* Al lado del gráfico anual y no debajo: la pregunta que sigue a «cómo
            va el mes» es «de dónde salió», y ese es el libro. En `xl` ocupa la
            columna estrecha que deja el gráfico. */}
        <Card densidad="plana" className="md:col-span-6 xl:col-span-4">
          <div className="p-5 sm:p-6">
            <CardHeader
              titulo="Últimos pagos"
              descripcion="Cada cobro con su plan y su método. Lleva a la ficha del cliente."
            />
          </div>
          <UltimosPagos pagos={pagos} />
        </Card>

        {/* ⚠️ Deuda REAL, no la «Cartera por vencer» del Dashboard, que es
            dinero que aún no se debe. Se llaman parecido y son opuestas. */}
        <Card densidad="normal" className="md:col-span-6 xl:col-span-4">
          <CardHeader
            titulo="Cartera vencida"
            descripcion="Membresías ya caducadas y sin renovar, por antigüedad de la deuda."
          />
          <Cartera tramos={cartera} />
        </Card>

        <ChartCard
          titulo="Gastos por categoría"
          descripcion="La marca vertical señala el presupuesto asignado a cada categoría este mes."
          className="md:col-span-6 xl:col-span-8"
          tabla={{
            cabeceras: ["Categoría", "Gastado", "Presupuesto", "Desviación"],
            filas: gastos.map((g) => [
              g.categoria,
              moneda(g.importe),
              moneda(g.presupuesto),
              `${g.importe > g.presupuesto ? "+" : ""}${moneda(g.importe - g.presupuesto)}`,
            ]),
          }}
        >
          <HBars
            datos={gastos.map((g) => ({
              label: g.categoria,
              value: g.importe,
              referencia: g.presupuesto,
            }))}
            color={C2}
            formatoValor={moneda}
            etiquetaReferencia="Presupuesto del mes"
          />
        </ChartCard>

        <Card className="md:col-span-6 xl:col-span-12">
          <h2 className="eyebrow text-verde-300">
            Pendiente en esta sección
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {PREVISTO.map((p) => (
              <li key={p} className="flex gap-3 text-sm text-verde-700">
                <span aria-hidden="true" className="text-dorado">
                  ◆
                </span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
