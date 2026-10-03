import PanelDashboard, { type FilaClase } from "@/components/admin/inicio/PanelDashboard";
import {
  activosPorMes,
  cumpleanosDeHoy,
  porVencer,
  resumenClases,
  resumenClientes,
} from "@/lib/admin/dashboard";
import { fecha } from "@/lib/admin/format";
import { diaLargo, horaEnBogota, hoyEnBogota } from "@/lib/admin/horario";
import {
  SEMANAS_RESERVAS,
  getClases,
  getDatosDashboard,
  getReservasPorDiaSemana,
} from "@/lib/admin/queries";
import type { ClaseEnAgenda } from "@/lib/admin/types";
import {
  enlaceWhatsApp,
  mensajeCumpleanos,
  mensajeRecordatorio,
} from "@/lib/admin/whatsapp";

/** Solo lo que pinta la fila: la agenda trae además quién reservó, y eso no
 *  tiene por qué viajar al navegador. */
const aFila = (c: ClaseEnAgenda): FilaClase => ({
  id: c.id,
  fecha: c.fecha,
  horaInicio: c.horaInicio,
  horaFin: c.horaFin,
  tipo: c.tipo,
  instructora: c.instructora,
  reservas: c.reservas,
  cupos: c.cupos,
  estado: c.estado,
});

/**
 * Dashboard (rediseñado oct 2026 con la organización de JainSportBox).
 *
 * Se calcula entero aquí, en el servidor, con funciones puras
 * (`lib/admin/dashboard.ts`), y baja ya resuelto: el panel solo alterna
 * pestañas. Sin dinero —vive en Finanzas—, así que es el mismo para todo el
 * equipo y no hay que esconder tarjetas por rol.
 */
export default async function DashboardPage() {
  const hoy = hoyEnBogota();
  const [datos, agenda, porDia] = await Promise.all([
    getDatosDashboard(),
    getClases(hoy, horaEnBogota()),
    getReservasPorDiaSemana(hoy),
  ]);

  const resumen = resumenClientes(datos, hoy);
  const clases = resumenClases(agenda, hoy);
  const dia = diaLargo(hoy);

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <h1 className="sr-only">Dashboard</h1>
      <PanelDashboard
        fechaTexto={dia.charAt(0).toUpperCase() + dia.slice(1)}
        hoy={hoy}
        clientes={{
          activos: resumen.activos,
          diferencia: resumen.activos - resumen.activosHace30,
          sinPlan: resumen.sinPlan,
          recuperables: resumen.recuperables,
          renovacion: resumen.renovacion,
          porVencer: porVencer(datos, hoy).map((c) => ({
            id: c.id,
            nombre: c.nombre,
            plan: c.plan,
            cuando:
              c.dias === 0
                ? "hoy"
                : c.dias === 1
                  ? "mañana"
                  : `en ${c.dias} días · ${fecha(c.vencimiento)}`,
            urgente: c.dias <= 1,
            whatsapp: enlaceWhatsApp(
              c.telefono,
              mensajeRecordatorio(c.nombre, c.plan, c.vencimiento, hoy),
            ),
          })),
          cumpleanos: cumpleanosDeHoy(datos, hoy).map((c) => ({
            id: c.id,
            nombre: c.nombre,
            edad: c.edad,
            whatsapp: enlaceWhatsApp(c.telefono, mensajeCumpleanos(c.nombre)),
          })),
          activosPorMes: activosPorMes(datos, hoy),
        }}
        clases={{
          hoy: clases.hoy,
          semana: clases.semana,
          ocupacion30: clases.ocupacion30,
          promedio30: clases.promedio30,
          deHoy: clases.deHoy.map(aFila),
          llenas: clases.llenas.map(aFila),
          porDia,
          semanasPorDia: SEMANAS_RESERVAS,
        }}
      />
    </div>
  );
}
