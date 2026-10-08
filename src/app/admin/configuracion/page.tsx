import type { Metadata } from "next";
import PanelConfiguracion from "@/components/admin/configuracion/PanelConfiguracion";
import { hoyEnBogota } from "@/lib/admin/horario";
import { getConfiguracion, getUsuarioActual } from "@/lib/admin/queries";

export const metadata: Metadata = {
  title: "Configuración · Panel administrativo",
  robots: { index: false, follow: false },
};

/**
 * Configuración del estudio (oct 2026, paso 4): semanas de agenda, plazo para
 * cancelar, aforo de las salas y días cerrados.
 *
 * ⚠️ Solo Administración, como en la base (RLS de `ajustes`, `salas` y
 * `dias_cerrados`). A los demás se les dice, no se les enseña un formulario
 * que fallaría al guardar.
 */
export default async function ConfiguracionPage() {
  const usuario = await getUsuarioActual();
  if (usuario?.rol !== "Administración") {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="sr-only">Configuración</h1>
        <div className="rounded-2xl border border-beige bg-white px-6 py-12 text-center">
          <p className="font-display text-2xl text-verde">La configuración es de Administración</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-verde-300">
            Cambia cómo funciona la agenda para todo el estudio. Si algo hay que ajustar, pídeselo a
            Administración.
          </p>
        </div>
      </div>
    );
  }

  const hoy = hoyEnBogota();
  const config = await getConfiguracion(hoy);
  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <h1 className="sr-only">Configuración</h1>
      <PanelConfiguracion config={config} hoy={hoy} />
    </div>
  );
}
