import Link from "next/link";
import { redirect } from "next/navigation";
import PanelCliente from "@/components/cliente/PanelCliente";
import { horaEnBogota, hoyEnBogota } from "@/lib/admin/horario";
import { aperturaPosible } from "@/lib/admin/campana";
import { getEstadoCampana, getPlanesALaVenta } from "@/lib/admin/queries";
import { getAgendaCliente, getHorasParaCancelar, getMiCuenta } from "@/lib/cliente/datos";

/**
 * Área de cliente → Inicio: su plan y sus próximas clases. La agenda para
 * reservar está en `/mi-cuenta/reservar`.
 *
 * Todo lo que se pinta lo deja leer RLS con la sesión del propio cliente, y
 * las reglas de reservar y cancelar las aplica la base (`reservar_mi_clase`,
 * `cancelar_mi_reserva`). Aquí solo se anuncian antes de pulsar.
 *
 * Si el estudio ha puesto algún plan con descuento (oct 2026), arriba sale un
 * aviso que lleva a Planes. Sin descuentos, no hay aviso. Si corre una
 * campaña de apertura y sería su primera membresía, el aviso es el de la
 * campaña (manda sobre el de los planes: no se suman).
 */
export default async function MiCuentaPage() {
  const cuenta = await getMiCuenta();
  // El layout ya lo filtra; esto es para que TypeScript lo sepa.
  if (!cuenta) redirect("/login");

  const hoy = hoyEnBogota();
  const [agenda, horasParaCancelar, planes, campana] = await Promise.all([
    getAgendaCliente(hoy),
    getHorasParaCancelar(),
    getPlanesALaVenta(),
    getEstadoCampana(),
  ]);
  const pctApertura = aperturaPosible(campana, cuenta.cobertura.length === 0);
  const mayor = Math.max(0, ...planes.map((p) => p.descuento?.pct ?? 0));
  const aviso =
    campana?.tramo && pctApertura !== null
      ? {
          rotulo: campana.nombre,
          texto: `−${pctApertura} % en tu primera membresía`,
          detalle:
            campana.tramo.quedan === 1
              ? "Queda el último cupo a este precio"
              : `Quedan ${campana.tramo.quedan} cupos a este precio`,
        }
      : mayor > 0
        ? { rotulo: "Precio especial", texto: `Planes con hasta ${mayor} % de descuento`, detalle: null }
        : null;

  return (
    <div className="space-y-6">
      {aviso && (
        <Link
          href="/mi-cuenta/planes"
          className="group flex items-center justify-between gap-4 rounded-2xl border border-dorado bg-gradient-to-r from-dorado/15 to-white px-5 py-4 ring-1 ring-dorado/40 transition-colors duration-300 hover:bg-dorado/20"
        >
          <span className="min-w-0">
            <span className="block text-xs font-bold uppercase tracking-widest text-dorado-tinta">
              {aviso.rotulo}
            </span>
            <span className="mt-0.5 block font-display text-xl text-verde">{aviso.texto}</span>
            {aviso.detalle && <span className="mt-0.5 block text-sm text-verde-700">{aviso.detalle}</span>}
          </span>
          <span
            aria-hidden="true"
            className="shrink-0 text-verde transition-transform duration-300 group-hover:translate-x-1"
          >
            →
          </span>
        </Link>
      )}
      <PanelCliente
        vista="inicio"
        cuenta={cuenta}
        agenda={agenda}
        hoy={hoy}
        ahora={horaEnBogota()}
        horasParaCancelar={horasParaCancelar}
      />
    </div>
  );
}
