import Card from "@/components/admin/Card";
import PanelEstadisticas from "@/components/admin/estadisticas/PanelEstadisticas";
import {
  DIAS_DORMIDO,
  SEMANAS_CLASES,
  activosHoy,
  dormidos,
  mapaHorarios,
  movimientoPorMes,
  ocupacionPor,
  perfilEdades,
  permanencia,
  porPlan,
  tramosPorCliente,
  usoPorPlan,
} from "@/lib/admin/estadisticas";
import { fecha } from "@/lib/admin/format";
import { diasEntre, horaEnBogota, hoyEnBogota } from "@/lib/admin/horario";
import { getClases, getDatosEstadisticas, getUsuarioActual } from "@/lib/admin/queries";

/**
 * Estadísticas: cómo se mueven los clientes (copia de `admingymdemo`) y cómo
 * van las clases (propio de Reforme). Ver `lib/admin/estadisticas.ts`.
 *
 * ⚠️ **Solo Administración**, como en la demo: muestra cuánto deja cada
 * cliente, y RLS no da los pagos a las instructoras.
 */
export default async function EstadisticasPage() {
  const usuario = await getUsuarioActual();
  if (usuario?.rol !== "Administración") {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="sr-only">Estadísticas</h1>
        <Card>
          <p className="font-display text-2xl text-verde">Las estadísticas son de Administración</p>
          <p className="mt-2 text-sm text-verde-700">
            Incluyen lo que deja cada cliente en membresías, que solo ve ese rol.
          </p>
        </Card>
      </div>
    );
  }

  const hoy = hoyEnBogota();
  const [datos, agenda] = await Promise.all([getDatosEstadisticas(), getClases(hoy, horaEnBogota())]);

  const tramos = tramosPorCliente(datos.membresias);
  const activos = activosHoy(datos.membresias, hoy);
  const nombre = new Map(datos.clientes.map((c) => [c.id, c.nombre]));

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <h1 className="sr-only">Estadísticas</h1>
      <PanelEstadisticas
        mesHoy={hoy.slice(0, 7)}
        movimiento={movimientoPorMes(tramos, hoy)}
        permanencia={permanencia(tramos, datos.pagos, hoy)}
        planes={porPlan(datos, hoy)}
        edades={perfilEdades(datos, activos, hoy)}
        clases={{
          semanas: SEMANAS_CLASES,
          mapa: mapaHorarios(agenda, hoy),
          porInstructora: ocupacionPor(agenda, hoy, (c) => c.instructora),
          porModalidad: ocupacionPor(agenda, hoy, (c) => c.tipo),
          uso: usoPorPlan(datos, agenda, hoy),
          diasDormido: DIAS_DORMIDO,
          dormidos: dormidos(agenda, activos, hoy).map((d) => ({
            clienteId: d.clienteId,
            nombre: nombre.get(d.clienteId) ?? "Cliente",
            hace:
              d.ultima === null
                ? "Sin reservas registradas"
                : `Última reserva hace ${diasEntre(d.ultima, hoy)} días · ${fecha(d.ultima)}`,
          })),
        }}
      />
    </div>
  );
}
