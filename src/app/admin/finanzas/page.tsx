import Card from "@/components/admin/Card";
import CardHeader from "@/components/admin/CardHeader";
import StatTile from "@/components/admin/StatTile";
import LibroPagos from "@/components/admin/finanzas/LibroPagos";
import RegistrarGasto from "@/components/admin/finanzas/RegistrarGasto";
import {
  getHoy,
  getIndicadoresFinanzas,
  getPagos,
} from "@/lib/admin/queries";

/**
 * Finanzas.
 *
 * ⚠️ **«Ingresos frente a gastos» y «Gastos por categoría» se fueron al
 * Dashboard**, juntas en una sola tarjeta con desplegable. Aquí quedaba el
 * detalle contable en dos gráficos anuales que competían con el libro, que es
 * a lo que de verdad se entra a esta pantalla. Ojo: es la decisión contraria a
 * la que documentaba `CONTEXTO.md` («son detalle contable, no resumen de
 * negocio»), y se revierte a petición del usuario.
 *
 * ⚠️ **Ya no hay lista de «pendiente en esta sección».** Tenía tres puntos:
 * registrar gastos —que ahora existe como formulario—, cierre de caja y
 * presupuesto anual, los dos descartados por el usuario. Lo que falta de
 * verdad lo dice el propio formulario al enviarlo: que todavía no guarda.
 */
export default function FinanzasPage() {
  const indicadores = getIndicadoresFinanzas();
  const pagos = getPagos();
  const hoy = getHoy();

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <h1 className="sr-only">Finanzas</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12 xl:gap-5">
        {/* Las cuatro cifras del mes, antes de cualquier detalle. Reutilizan
            `StatTile`, el mismo componente del Dashboard. */}
        <section
          aria-label="Cifras del mes"
          className="grid gap-4 sm:grid-cols-2 md:col-span-6 xl:col-span-12 xl:grid-cols-4"
        >
          {indicadores.map((i) => (
            <StatTile key={i.etiqueta} indicador={i} />
          ))}
        </section>

        {/* El libro es LA pantalla, a ancho completo. Con la tabla a cinco
            columnas —fecha, cliente, plan, método e importe— una columna
            estrecha obligaba a recortar el nombre del cliente casi siempre. */}
        <Card densidad="plana" className="md:col-span-6 xl:col-span-12">
          {/* El alta de gasto vive en la cabecera del libro, no en una barra
              propia: un gasto es un movimiento más, y se registra mirando los
              que ya están. `CardHeader` deja su hueco a la derecha justo para
              esto. */}
          <div className="flex flex-wrap items-start justify-between gap-3 p-5 sm:p-6">
            <CardHeader
              titulo="Libro de movimientos"
              descripcion="Todos los cobros, con su plan y su método. Cada fila lleva a la ficha del cliente."
            />
            <RegistrarGasto hoy={hoy} />
          </div>
          <LibroPagos pagos={pagos} hoy={hoy} />
        </Card>
      </div>
    </div>
  );
}
