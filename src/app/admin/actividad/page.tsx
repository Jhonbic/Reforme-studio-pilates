import type { Metadata } from "next";
import PanelActividad from "@/components/admin/actividad/PanelActividad";
import { exigirSeccion } from "@/lib/admin/acceso";
import { hoyEnBogota } from "@/lib/admin/horario";
import { DIAS_ACTIVIDAD, getActividad } from "@/lib/admin/queries";

export const metadata: Metadata = {
  title: "Actividad · Panel · Reforme Studio Pilates",
};

/**
 * Actividad de reservas (nov 2026): quién reservó, canceló o cambió una clase.
 * Se entra por la campana de la barra lateral.
 *
 * La ven los tres roles: Administración y Recepción, todo; la instructora, lo
 * de sus clases (lo decide RLS, no la página). Abrirla marca lo visto
 * (`getActividad`), y la campana baja a cero.
 *
 * El `<h1>` va `sr-only` porque el visible lo pone `AdminTopbar` desde la ruta.
 */
export default async function ActividadPage() {
  const usuario = await exigirSeccion("/admin/actividad");
  const { avisos, vistoHasta } = await getActividad();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="sr-only">Actividad de reservas</h1>
      <PanelActividad
        avisos={avisos}
        vistoHasta={vistoHasta}
        ahora={new Date().toISOString()}
        hoy={hoyEnBogota()}
        verFichas={usuario.rol !== "Instructora"}
        dias={DIAS_ACTIVIDAD}
      />
    </div>
  );
}
