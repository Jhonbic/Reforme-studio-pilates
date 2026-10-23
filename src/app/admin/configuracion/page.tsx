import type { Metadata } from "next";
import MiPerfil from "@/components/admin/configuracion/MiPerfil";
import PanelConfiguracion from "@/components/admin/configuracion/PanelConfiguracion";
import { hoyEnBogota } from "@/lib/admin/horario";
import { getConfiguracion, getUsuarioActual } from "@/lib/admin/queries";

export const metadata: Metadata = {
  title: "Configuración · Panel administrativo",
  robots: { index: false, follow: false },
};

/**
 * Configuración: **Mi perfil** (cada rol: contraseña y cerrar sesión) y, solo
 * para Administración, la del estudio (paso 4): plazo para cancelar, meta,
 * aforo de las salas, días cerrados y formas de pago.
 *
 * ⚠️ La parte del estudio es solo de Administración, como en la base (RLS de
 * `ajustes`, `salas` y `dias_cerrados`): a los demás ni se les pide ni se les
 * enseña un formulario que fallaría al guardar.
 */
export default async function ConfiguracionPage() {
  const usuario = await getUsuarioActual();
  // El layout ya echa a quien no tiene perfil; esto solo estrecha el tipo.
  if (!usuario) return null;

  const esAdministracion = usuario.rol === "Administración";
  const hoy = hoyEnBogota();
  const config = esAdministracion ? await getConfiguracion(hoy) : null;

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <h1 className="sr-only">Configuración</h1>
      <MiPerfil usuario={usuario} />
      {config && (
        <section aria-labelledby="config-estudio" className="space-y-3">
          <p id="config-estudio" className="eyebrow text-dorado-tinta">
            Del estudio
          </p>
          <PanelConfiguracion config={config} hoy={hoy} />
        </section>
      )}
    </div>
  );
}
