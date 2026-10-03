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
 * Desde oct 2026 todo el dinero vive aquí (como en JainSportBox): el
 * Dashboard ya no tiene tarjetas de dinero. La gráfica de «ingresos frente a
 * gastos» por mes NO está en ninguna pantalla: el usuario la quiso fuera
 * («gráficas feas sin sentido»). No volver a ponerla.
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

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <h1 className="sr-only">Finanzas</h1>
      <PanelFinanzas movimientos={movimientos} presupuestos={presupuestos} hoy={hoy} />
    </div>
  );
}
