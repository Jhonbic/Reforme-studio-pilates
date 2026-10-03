import Card from "@/components/admin/Card";
import ChartCard from "@/components/admin/ChartCard";
import GroupedBars from "@/components/admin/charts/GroupedBars";
import PanelFinanzas from "@/components/admin/finanzas/PanelFinanzas";
import { serieMensual } from "@/lib/admin/dashboard";
import { moneda } from "@/lib/admin/format";
import { hoyEnBogota } from "@/lib/admin/horario";
import {
  getMovimientos,
  getPresupuestos,
  getUsuarioActual,
} from "@/lib/admin/queries";

/**
 * Finanzas, leyendo de Supabase (`pagos`, `gastos`, `presupuestos`).
 *
 * ⚠️ **Solo para Administración.** RLS solo le da gastos y presupuestos a ese
 * rol: Recepción vería los cobros sin los gastos y una utilidad inflada, sin
 * nada que lo advirtiera. Mejor decirlo que enseñar una cifra falsa.
 *
 * ⚠️ «Hoy» es la fecha REAL de Bogotá (`hoyEnBogota()`), no la `getHoy()`
 * congelada del mock: aquí los datos son de verdad, y con la fecha de julio
 * «este mes» enseñaría un mes en el que la base no tiene nada.
 *
 * Desde oct 2026 TODO el dinero vive aquí (estructura de JainSportBox): el
 * Dashboard ya no tiene tarjetas de dinero, y la tendencia del año
 * («Ingresos y gastos por mes») se mudó al final de esta pantalla.
 */
export default async function FinanzasPage() {
  const usuario = await getUsuarioActual();

  if (usuario?.rol !== "Administración") {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="sr-only">Finanzas</h1>
        <Card>
          <p className="font-display text-2xl text-verde">
            Finanzas es de Administración
          </p>
          <p className="mt-2 text-sm text-verde-700">
            Los gastos y los presupuestos solo los ve ese rol, y sin ellos las
            cifras de esta pantalla saldrían falseadas. Si necesitas ver los
            cobros, pídeselos a administración.
          </p>
        </Card>
      </div>
    );
  }

  const [movimientos, presupuestos] = await Promise.all([
    getMovimientos(),
    getPresupuestos(),
  ]);
  const hoy = hoyEnBogota();
  const meses = serieMensual(
    {
      pagos: movimientos.filter((m) => m.tipo === "cobro"),
      gastos: movimientos.filter((m) => m.tipo === "gasto"),
    },
    hoy,
  );

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <h1 className="sr-only">Finanzas</h1>
      <PanelFinanzas movimientos={movimientos} presupuestos={presupuestos} hoy={hoy} />

      {/* La tendencia del año, que antes estaba en el Dashboard. Va aparte del
          selector de periodo a propósito: responde a «¿cómo vamos este año?»,
          no al periodo que se esté mirando arriba. */}
      <ChartCard
        className="mt-4 xl:mt-5"
        titulo="Ingresos y gastos por mes"
        descripcion="Los últimos doce meses. La distancia entre las dos barras de cada mes es la utilidad."
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
          datos={meses.map((m) => ({ label: m.mes, valores: [m.ingresos, m.gastos] }))}
          series={[
            { nombre: "Ingresos", color: "var(--color-chart-1)" },
            { nombre: "Gastos", color: "var(--color-chart-2)" },
          ]}
          formato="moneda"
        />
      </ChartCard>
    </div>
  );
}
