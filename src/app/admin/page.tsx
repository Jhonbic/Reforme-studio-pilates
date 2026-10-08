import PanelDashboard from "@/components/admin/inicio/PanelDashboard";
import {
  activosEl,
  activosPorMes,
  avanceMeta,
  ingresosDelMes,
  cumpleanosDeHoy,
  porVencer,
  resumenClases,
  resumenClientes,
} from "@/lib/admin/dashboard";
import { horaEnBogota, hoyEnBogota, sumarDias } from "@/lib/admin/horario";
import { moneda } from "@/lib/admin/format";
import { mesAnterior } from "@/lib/admin/periodo";
import {
  getClases,
  getDatosDashboard,
  getMetaClientes,
  getPagosDesde,
  getPagosPendientes,
  getUsuarioActual,
} from "@/lib/admin/queries";
import {
  enlaceWhatsApp,
  mensajeCumpleanos,
  mensajePendiente,
  mensajeRecordatorio,
} from "@/lib/admin/whatsapp";

const FECHA_COMPLETA = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** «Vence hoy», «Vence mañana», «Vence en 3 días»: como lo dice Jain. */
function textoVence(dias: number): string {
  if (dias === 0) return "Vence hoy";
  if (dias === 1) return "Vence mañana";
  return `Vence en ${dias} días`;
}

/**
 * Dashboard: la copia del de JainSportBox (ver `PanelDashboard`).
 *
 * Se calcula entero aquí, en el servidor, con funciones puras
 * (`lib/admin/dashboard.ts`), y baja ya resuelto.
 *
 * Arriba, la fila del paso 6: meta de clientes (todo el equipo), ingresos del
 * mes (solo Administración) y por cobrar (el mostrador, que es quien cobra).
 * Lo que un rol no ve ni se pide: RLS devolvería vacío y saldría «$0».
 */
export default async function DashboardPage() {
  const hoy = hoyEnBogota();
  const usuario = await getUsuarioActual();
  const esAdmin = usuario?.rol === "Administración";
  const esMostrador = esAdmin || usuario?.rol === "Recepción";
  const [datos, agenda, meta, pagos, pendientes] = await Promise.all([
    getDatosDashboard(),
    getClases(hoy, horaEnBogota()),
    getMetaClientes(),
    // Desde el 1 del mes pasado: lo justo para comparar con el mismo tramo.
    esAdmin ? getPagosDesde(mesAnterior(hoy).desde) : null,
    esMostrador ? getPagosPendientes() : null,
  ]);

  const resumen = resumenClientes(datos, hoy);
  const serie = activosPorMes(datos, hoy);
  const clases = resumenClases(agenda, hoy, activosEl(hoy, datos.membresias));

  // El calendario deja mirar el mes anterior, este y el siguiente: solo viaja
  // ese tramo de la agenda, y de cada clase solo los nombres de quien reservó.
  const mes = hoy.slice(0, 7);
  // El día antes del 1 cae siempre en el mes anterior, y 32 días después del
  // 1 siempre en el siguiente (ningún mes tiene más de 31).
  const desde = sumarDias(`${mes}-01`, -1).slice(0, 7);
  const hasta = sumarDias(`${mes}-01`, 32).slice(0, 7);
  const delMes = agenda
    .filter((c) => c.fecha.slice(0, 7) >= desde && c.fecha.slice(0, 7) <= hasta)
    .map((c) => ({
      id: c.id,
      fecha: c.fecha,
      horaInicio: c.horaInicio,
      tipo: c.tipo,
      instructora: c.instructora,
      cancelada: c.cancelada,
      personas: c.reservados.map((r) => r.nombre),
    }));

  const fechaTexto = FECHA_COMPLETA.format(new Date(`${hoy}T00:00:00Z`));

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <h1 className="sr-only">Dashboard</h1>
      <PanelDashboard
        fechaTexto={fechaTexto.charAt(0).toUpperCase() + fechaTexto.slice(1)}
        hoy={hoy}
        meta={avanceMeta(resumen.activos, meta)}
        ingresos={pagos ? ingresosDelMes(pagos, hoy) : null}
        porCobrar={
          pendientes
            ? {
                total: pendientes.reduce((t, p) => t + p.pendiente, 0),
                clientes: new Set(pendientes.map((p) => p.clienteId)).size,
                filas: pendientes.map((p) => ({
                  id: p.membresiaId,
                  clienteId: p.clienteId,
                  nombre: p.nombre,
                  detalle: `Debe ${moneda(p.pendiente)} · ${p.plan}`,
                  whatsapp: enlaceWhatsApp(
                    p.telefono,
                    mensajePendiente(p.nombre, p.plan, moneda(p.pendiente)),
                  ),
                })),
              }
            : null
        }
        clientes={{
          activos: resumen.activos,
          // Contra el cierre del mes pasado, de la misma serie que dibuja la
          // gráfica (como Jain).
          deltaActivos: serie.length >= 2 ? serie[11].activos - serie[10].activos : null,
          pendientes: resumen.sinPlan,
          recuperables: resumen.recuperables,
          renovacion: {
            porcentaje: resumen.renovacion.valor,
            renovaron: resumen.renovacion.renovaron,
            vencieron: resumen.renovacion.vencieron,
          },
          porVencer: porVencer(datos, hoy).map((c) => ({
            id: c.id,
            nombre: c.nombre,
            vence: textoVence(c.dias),
            urgente: c.dias <= 1,
            whatsapp: enlaceWhatsApp(
              c.telefono,
              mensajeRecordatorio(c.nombre, c.plan, c.vencimiento, hoy),
            ),
          })),
          cumpleanos: cumpleanosDeHoy(datos, hoy).map((c) => ({
            id: c.id,
            nombre: c.nombre,
            whatsapp: enlaceWhatsApp(c.telefono, mensajeCumpleanos(c.nombre)),
          })),
          activosPorMes: serie,
        }}
        clases={{
          hoy: clases.hoy,
          semana: clases.semana,
          promedioDiario: clases.promedioDiario,
          participacion: clases.participacion,
          personasSemana: clases.personasSemana,
          activos: resumen.activos,
          delMes,
        }}
      />
    </div>
  );
}
