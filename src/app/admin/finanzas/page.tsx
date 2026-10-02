import Card from "@/components/admin/Card";
import PanelFinanzas from "@/components/admin/finanzas/PanelFinanzas";
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
 * Las dos tarjetas de gráficas («Ingresos frente a gastos», «Gastos por
 * categoría») siguen en el Dashboard: aquí se entra a mirar el detalle de un
 * periodo, no la tendencia del año.
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

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <h1 className="sr-only">Finanzas</h1>
      <PanelFinanzas
        movimientos={movimientos}
        presupuestos={presupuestos}
        hoy={hoyEnBogota()}
      />
    </div>
  );
}
