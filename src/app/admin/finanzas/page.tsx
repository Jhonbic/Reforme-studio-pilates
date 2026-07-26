import Card from "@/components/admin/Card";
import CardHeader from "@/components/admin/CardHeader";
import StatTile from "@/components/admin/StatTile";
import LibroPagos from "@/components/admin/finanzas/LibroPagos";
import { HOY } from "@/lib/admin/mock";
import { getIndicadoresFinanzas, getPagos } from "@/lib/admin/queries";

/* Lo que sigue faltando. Todo lo que queda pide ESCRIBIR —registrar un gasto,
   cerrar la caja, guardar un comprobante—, y eso no se puede hacer sin base de
   datos. Los puntos que solo pedían LEER ya están construidos. */
const PREVISTO = [
  "Registrar gastos a mano, con su comprobante adjunto",
  "Cierre de caja diario: cuadrar el efectivo contra lo digital",
  "Presupuesto anual, no solo el del mes en curso",
];

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
 * Lo que queda aquí es lo que solo tiene sentido en Finanzas: el libro de
 * movimientos y la deuda.
 */
export default function FinanzasPage() {
  const indicadores = getIndicadoresFinanzas();
  const pagos = getPagos();

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
          <div className="p-5 sm:p-6">
            <CardHeader
              titulo="Libro de movimientos"
              descripcion="Todos los cobros, con su plan y su método. Cada fila lleva a la ficha del cliente."
            />
          </div>
          <LibroPagos pagos={pagos} hoy={HOY} />
        </Card>

        {/* Los pendientes van al final y en horizontal: son una nota al pie de
            la sección, no un bloque que compita con el libro. */}
        <Card tono="acento" className="md:col-span-6 xl:col-span-12">
          <h2 className="font-display text-lg">Pendiente en esta sección</h2>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            {PREVISTO.map((p) => (
              <li key={p} className="flex gap-2.5">
                <span aria-hidden="true">◆</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm">
            Las tres necesitan base de datos: hoy Finanzas se lee, no se
            escribe.
          </p>
        </Card>
      </div>
    </div>
  );
}
