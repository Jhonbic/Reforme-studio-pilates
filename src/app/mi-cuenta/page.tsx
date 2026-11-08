import Link from "next/link";
import { redirect } from "next/navigation";
import PanelCliente from "@/components/cliente/PanelCliente";
import { horaEnBogota, hoyEnBogota, sumarDias } from "@/lib/admin/horario";
import { tieneDerechoApertura } from "@/lib/admin/campana";
import { getEstadoCampana } from "@/lib/admin/queries";
import { getAgendaCliente, getHorasParaCancelar, getMiCuenta, getMiHistorial } from "@/lib/cliente/datos";
import { MESES_HISTORIAL } from "@/lib/cliente/inicio";

/**
 * Área de cliente → Inicio: su plan, su próxima clase, clases con cupo para
 * reservar de un toque y el calendario de las clases a las que fue (nov
 * 2026). La agenda completa está en `/mi-cuenta/reservar`.
 *
 * Todo lo que se pinta lo deja leer RLS con la sesión del propio cliente, y
 * las reglas de reservar y cancelar las aplica la base (`reservar_mi_clase`,
 * `cancelar_mi_reserva`). Aquí solo se anuncian antes de pulsar.
 *
 * Si corre una campaña de apertura y sería su primera membresía, arriba sale
 * su aviso, que lleva a Planes. ⚠️ Los descuentos propios de los planes ya NO
 * llevan aviso aquí (decisión del usuario, nov 2026): se ven en Planes.
 */
export default async function MiCuentaPage() {
  const cuenta = await getMiCuenta();
  // El layout ya lo filtra; esto es para que TypeScript lo sepa.
  if (!cuenta) redirect("/login");

  const hoy = hoyEnBogota();
  // El historial, desde el día 1 del mes más antiguo que deja ver el calendario.
  const desde = sumarDias(`${hoy.slice(0, 7)}-01`, -31 * (MESES_HISTORIAL - 1));
  const [agenda, horasParaCancelar, campana, historial] = await Promise.all([
    getAgendaCliente(hoy),
    getHorasParaCancelar(),
    getEstadoCampana(),
    getMiHistorial(desde, hoy),
  ]);
  // El aviso es de la campaña en general: los planes que entran los dice Planes.
  const pctApertura = tieneDerechoApertura(campana, cuenta.planesComprados) ? campana!.tramo!.pct : null;
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
        historial={historial}
      />
    </div>
  );
}
