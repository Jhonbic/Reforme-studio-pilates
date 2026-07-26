import Card from "@/components/admin/Card";
import CardHeader from "@/components/admin/CardHeader";
import FilaPlan from "@/components/admin/planes/FilaPlan";
import { moneda, numero } from "@/lib/admin/format";
import { getPlanes } from "@/lib/admin/queries";

/**
 * Catálogo de planes.
 *
 * Sustituye al marcador `SeccionPendiente`. Enseña **solo lo que ya se sabe**:
 * las cuatro modalidades con su precio, su vigencia, cuántos clientes las
 * tienen y cuánto facturan. Crear, editar precios y programar promociones
 * necesitan escribir en algún sitio, así que siguen pendientes y se dicen como
 * pendientes, no con botones que no hacen nada.
 *
 * ⚠️ El precio no se guarda aquí ni en el catálogo: sale de `PRECIO_PLAN`, el
 * mismo que se le cobra a cada cliente. Y los clientes se cuentan sobre
 * `CLIENTES`. Ver `getPlanes()`.
 */
export default function PlanesPage() {
  const planes = getPlanes();

  const clientesConPlan = planes.reduce((t, p) => t + p.clientes, 0);
  const facturacion = planes.reduce((t, p) => t + p.facturacionMes, 0);
  /* Ticket medio real: lo facturado entre quien lo paga. No es el promedio de
     los cuatro precios —eso daría el mismo peso a la clase suelta que al
     trimestral— sino cuánto deja de media un cliente. */
  const ticketMedio = clientesConPlan
    ? Math.round(facturacion / clientesConPlan)
    : 0;

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-4">
      <h1 className="sr-only">Planes</h1>

      <section
        aria-label="Resumen del catálogo"
        className="grid gap-4 sm:grid-cols-3"
      >
        <Card densidad="compacta" sheen>
          <p className="eyebrow text-dorado-dark">Modalidades</p>
          <p className="mt-2 font-display text-3xl tabular-nums text-verde">
            {numero(planes.filter((p) => p.seVende).length)}
          </p>
          <p className="mt-1 text-sm text-verde-300">a la venta hoy</p>
        </Card>

        <Card densidad="compacta" sheen>
          <p className="eyebrow text-dorado-dark">Facturación</p>
          <p className="mt-2 font-display text-3xl tabular-nums text-verde">
            {moneda(facturacion)}
          </p>
          <p className="mt-1 text-sm text-verde-300">
            este mes, todos los planes
          </p>
        </Card>

        <Card densidad="compacta" sheen>
          <p className="eyebrow text-dorado-dark">Ticket medio</p>
          <p className="mt-2 font-display text-3xl tabular-nums text-verde">
            {moneda(ticketMedio)}
          </p>
          <p className="mt-1 text-sm text-verde-300">por cliente y mes</p>
        </Card>
      </section>

      <Card densidad="plana">
        <div className="p-5 sm:p-6">
          <CardHeader
            titulo="Modalidades"
            descripcion="Lo que vende el estudio y cómo se está comportando cada plan."
          />
        </div>

        <ul className="divide-y divide-beige border-t border-beige">
          {planes.map((p) => (
            <li key={p.plan}>
              <FilaPlan plan={p} total={facturacion} />
            </li>
          ))}
        </ul>
      </Card>

      <Card tono="acento">
        <h2 className="font-display text-lg">Pendiente en esta sección</h2>
        <ul className="mt-3 space-y-1.5 text-sm">
          <li>Crear y retirar modalidades sin tocar código.</li>
          <li>Cambiar precios, guardando el histórico de cada cambio.</li>
          <li>Promociones y descuentos por temporada.</li>
        </ul>
        <p className="mt-3 text-sm">
          Las tres necesitan base de datos: hoy el catálogo se lee, no se edita.
        </p>
      </Card>
    </div>
  );
}
