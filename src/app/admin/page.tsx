import Card from "@/components/admin/Card";
import CardHeader from "@/components/admin/CardHeader";
import ChartCard from "@/components/admin/ChartCard";
import StatTile from "@/components/admin/StatTile";
import TarjetaIngresos from "@/components/admin/TarjetaIngresos";
import Donut from "@/components/admin/charts/Donut";
import GroupedBars from "@/components/admin/charts/GroupedBars";
import HBars from "@/components/admin/charts/HBars";
import {
  moneda,
  monedaCorta,
  numero,
  porcentaje,
  variacion as fmtVariacion,
} from "@/lib/admin/format";
import {
  getCartera,
  getGastos,
  getIndicadores,
  getIngresoEnRiesgo,
  getMembresiasPorVencer,
  getMesesFinancieros,
  getMovimientoClientes,
  getRepartoMetodos,
  getRepartoPlanes,
  getTasaRenovacion,
} from "@/lib/admin/queries";

// Colores de datos, en orden fijo. NO son los de marca: ver la nota en
// globals.css sobre por qué el verde y el dorado del logo no valen para esto.
const C1 = "var(--color-chart-1)";
const C2 = "var(--color-chart-2)";
const C3 = "var(--color-chart-3)";
const C4 = "var(--color-chart-4)";

/**
 * Dashboard.
 *
 * Rejilla bento: la jerarquía la marcan el TAMAÑO y el CONTRASTE, no unos
 * títulos de sección. Antes eran cuatro bloques con `<h2>` llenos de tarjetas
 * blancas idénticas — todo pesaba lo mismo, así que nada destacaba.
 *
 * ⚠️ 12 columnas solo en `xl`, saltándose `lg` a propósito: en `lg` ya está la
 * barra lateral de 256px y al contenido le quedan ~700px, el tramo más estrecho
 * de todo el escritorio. Doce columnas ahí darían tarjetas de 55px, así que
 * `lg` hereda el reparto de 6 de `md`.
 */
export default function DashboardPage() {
  const [ingresosMes, ...tiles] = getIndicadores();
  const meses = getMesesFinancieros();
  const planes = getRepartoPlanes();
  const metodos = getRepartoMetodos();
  const gastos = getGastos();
  const movimiento = getMovimientoClientes();
  const cartera = getCartera();
  const porVencer = getMembresiasPorVencer(15);
  const enRiesgo = getIngresoEnRiesgo(7);
  const renovacion = getTasaRenovacion();

  const totalPlanes = planes.reduce((t, p) => t + p.importe, 0);
  const totalMetodos = metodos.reduce((t, m) => t + m.importe, 0);
  const totalCartera = cartera.reduce((t, c) => t + c.importe, 0);

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      {/* El título visible lo pone AdminTopbar; el árbol de encabezados
          necesita igualmente un h1 en la página. */}
      <h1 className="sr-only">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12 xl:gap-5">
        {/* ---------- A · Ingresos del mes (ancla de la página) ---------- */}
        <TarjetaIngresos
          indicador={ingresosMes}
          meses={meses}
          className="md:col-span-6 xl:col-span-8"
        />

        {/* ---------- B · Las otras tres cifras ----------
            `content-between` las reparte a lo alto del héroe sin estirarlas:
            con `stretch` se deforman y el texto queda pegado arriba. */}
        <section
          aria-label="Cifras principales"
          className="grid gap-4 sm:grid-cols-3 md:col-span-6 xl:col-span-4 xl:h-full xl:grid-cols-1 xl:content-between"
        >
          {tiles.map((i) => (
            <StatTile key={i.etiqueta} indicador={i} />
          ))}
        </section>

        {/* ---------- C · Membresías por vencer ----------
            Lista accionable, no gráfico: el dato útil es a quién llamar, y para
            eso una tabla gana a cualquier gráfico. Sube a la primera fila
            porque es lo único de esta pantalla sobre lo que se actúa hoy. */}
        <Card id="por-vencer" className="md:col-span-6 xl:col-span-5">
          <CardHeader
            titulo="Membresías por vencer"
            descripcion="Próximos 15 días · a quién llamar esta semana"
            accion={
              <div className="rounded-xl bg-[color-mix(in_srgb,var(--color-estado-aviso)_12%,white)] px-3 py-2 text-right">
                <p className="text-xs text-verde-300">En riesgo (7 días)</p>
                <p className="font-display text-lg tabular-nums text-verde">
                  {moneda(enRiesgo)}
                </p>
              </div>
            }
          />

          <ul className="mt-5 divide-y divide-beige">
            {porVencer.map((m) => {
              const urgente = m.diasRestantes <= 3;
              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-verde">
                      {m.cliente}
                    </p>
                    <p className="text-xs text-verde-300">{m.plan}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="tabular-nums text-sm text-verde">
                      {moneda(m.importeRenovacion)}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs tabular-nums ${
                        urgente
                          ? "bg-[color-mix(in_srgb,var(--color-estado-grave)_14%,white)] text-[var(--color-estado-grave)]"
                          : "bg-beige text-verde-700"
                      }`}
                    >
                      {m.diasRestantes === 0
                        ? "Vence hoy"
                        : `${m.diasRestantes} días`}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* ---------- D · Tasa de renovación ----------
            Segunda tarjeta oscura: parte el bloque de tarjetas blancas y da
            ritmo a la rejilla. Es una sola cifra, así que aguanta el contraste
            sin necesitar gráfico. */}
        <Card
          tono="oscuro"
          className="flex flex-col justify-center md:col-span-3 xl:col-span-3"
        >
          <h2 className="font-display text-xl text-arena">
            Tasa de renovación
          </h2>
          <p className="mt-1 text-sm text-beige/75">
            Membresías vencidas que se renovaron
          </p>
          <p className="mt-6 font-display text-5xl tabular-nums leading-none text-arena xl:text-6xl">
            {porcentaje(renovacion.valor)}
          </p>
          {renovacion.variacion !== null && (
            <p className="mt-3 text-sm text-[var(--color-estado-ok-claro)]">
              <span aria-hidden="true">▲</span>{" "}
              {fmtVariacion(renovacion.variacion)} frente al mes anterior
            </p>
          )}
          <p className="mt-6 border-t border-verde-700 pt-4 text-sm leading-relaxed text-beige/75">
            Retener sale mucho más barato que captar: subir esta cifra unos
            puntos suele rendir más que cualquier campaña.
          </p>
        </Card>

        {/* ---------- E · Reparto de planes ---------- */}
        <ChartCard
          titulo="Ingresos por tipo de plan"
          descripcion="De qué se compone la facturación del mes. Si las clases sueltas pesan mucho, el ingreso es menos predecible."
          className="md:col-span-3 xl:col-span-4"
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

        {/* ---------- F · Ingresos frente a gastos ---------- */}
        <ChartCard
          titulo="Ingresos frente a gastos"
          descripcion="Las dos series comparten un mismo eje en pesos. La distancia entre barras es la utilidad del mes."
          className="md:col-span-6 xl:col-span-7"
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

        {/* ---------- G · Gastos por categoría ---------- */}
        <ChartCard
          titulo="Gastos por categoría"
          descripcion="La marca vertical señala el presupuesto asignado a cada categoría este mes."
          className="md:col-span-6 xl:col-span-5"
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

        {/* ---------- H · Altas y bajas ---------- */}
        <ChartCard
          titulo="Altas y bajas por mes"
          descripcion="Si las bajas superan a las altas, la base de clientes se encoge aunque la facturación aguante un tiempo."
          className="md:col-span-3 xl:col-span-4"
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

        {/* ---------- I · Cartera vencida ---------- */}
        <ChartCard
          titulo="Pagos vencidos por antigüedad"
          descripcion="Cuanto más viejo el tramo, menos probable el cobro. Pasados 60 días conviene decidir si se sigue reclamando."
          className="md:col-span-3 xl:col-span-4"
          tabla={{
            cabeceras: ["Tramo", "Clientes", "Importe"],
            filas: [
              ...cartera.map((c) => [
                c.tramo,
                numero(c.clientes),
                moneda(c.importe),
              ]),
              ["Total", "", moneda(totalCartera)],
            ],
          }}
        >
          <HBars
            datos={cartera.map((c) => ({ label: c.tramo, value: c.importe }))}
            color={C3}
            formatoValor={moneda}
          />
          <p className="mt-5 border-t border-beige pt-4 text-sm text-verde-300">
            Total sin cobrar{" "}
            <span className="font-display text-lg tabular-nums text-verde">
              {moneda(totalCartera)}
            </span>
          </p>
        </ChartCard>

        {/* ---------- J · Métodos de pago ---------- */}
        <ChartCard
          titulo="Cómo pagan los clientes"
          descripcion="Necesario para cuadrar caja: el efectivo se concilia a mano y lo digital llega al banco con otros tiempos."
          className="md:col-span-6 xl:col-span-4"
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

        {/* ---------- K · Aviso ---------- */}
        <Card
          tono="acento"
          densidad="compacta"
          className="md:col-span-6 xl:col-span-12"
        >
          <p className="text-sm leading-relaxed">
            <strong className="font-medium">Datos de ejemplo.</strong> Todas las
            cifras de esta pantalla son inventadas y sirven para validar el
            diseño. Vienen de{" "}
            <code className="text-xs">src/lib/admin/mock.ts</code>; cuando haya
            base de datos solo cambia ese archivo.
          </p>
        </Card>
      </div>
    </div>
  );
}
