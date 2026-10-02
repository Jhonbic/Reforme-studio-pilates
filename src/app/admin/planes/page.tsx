import PanelPlanes from "@/components/admin/planes/PanelPlanes";
import { hoyEnBogota } from "@/lib/admin/horario";
import { getPlanes, getUsuarioActual } from "@/lib/admin/queries";

/**
 * Catálogo de planes, leyendo de Supabase (tabla `planes`).
 *
 * La pantalla **es el catálogo y nada más**. Tuvo encima una fila de tres
 * cifras de resumen y debajo una nota de pendientes; las dos se quitaron porque
 * competían con lo único que se viene a mirar aquí. El recuento de modalidades
 * no se perdió: vive en la cabecera de `PanelPlanes`, junto al botón de alta.
 *
 * Crear, editar y eliminar existen como pantalla, pero **todavía no guardan**
 * (paso 7 del plan). Cada acción lo dice al ejecutarse, con un aviso `warning`.
 *
 * A diferencia de Finanzas, esta la puede abrir todo el equipo: recepción
 * necesita los precios para cobrar y las instructoras para orientar. Lo único
 * que depende del rol es el «Cobrado · 30 días», ver `getPlanes()`.
 */
export default async function PlanesPage() {
  const usuario = await getUsuarioActual();
  const puedeVerCobros =
    usuario?.rol === "Administración" || usuario?.rol === "Recepción";

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <h1 className="sr-only">Planes</h1>
      <PanelPlanes planes={await getPlanes(hoyEnBogota(), puedeVerCobros)} />
    </div>
  );
}
