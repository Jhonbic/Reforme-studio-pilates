import { redirect } from "next/navigation";
import PanelCliente from "@/components/cliente/PanelCliente";
import { horaEnBogota, hoyEnBogota } from "@/lib/admin/horario";
import { getAgendaCliente, getHorasParaCancelar, getMiCuenta } from "@/lib/cliente/datos";

/**
 * Área de cliente → Reservar: la agenda de los próximos días, con lo que le
 * queda del plan arriba.
 *
 * Todo lo que se pinta lo deja leer RLS con la sesión del propio cliente, y
 * las reglas de reservar y cancelar las aplica la base (`reservar_mi_clase`,
 * `cancelar_mi_reserva`). Aquí solo se anuncian antes de pulsar.
 */
export default async function ReservarPage() {
  const cuenta = await getMiCuenta();
  // El layout ya lo filtra; esto es para que TypeScript lo sepa.
  if (!cuenta) redirect("/login");

  const hoy = hoyEnBogota();
  const [agenda, horasParaCancelar] = await Promise.all([getAgendaCliente(hoy), getHorasParaCancelar()]);

  return (
    <PanelCliente
      vista="reservar"
      cuenta={cuenta}
      agenda={agenda}
      hoy={hoy}
      ahora={horaEnBogota()}
      horasParaCancelar={horasParaCancelar}
    />
  );
}
