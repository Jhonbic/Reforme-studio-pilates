import PanelClases from "@/components/admin/clases/PanelClases";
import { hoyEnBogota, horaEnBogota } from "@/lib/admin/horario";
import {
  getClases,
  getClientes,
  getInstructoras,
  getMiEquipoId,
  getUsuarioActual,
} from "@/lib/admin/queries";

/**
 * Agenda de clases, desde Supabase (tablas `clases` y `reservas`, paso 9).
 *
 * Página de servidor: pide los datos y los baja a `PanelClases`, que es de
 * cliente porque el día elegido, el filtro y los diálogos son estado local.
 *
 * Viaja una ventana de la agenda (ver `getClases`): cambiar de día dentro de
 * ella es instantáneo.
 *
 * Programar, cancelar y apuntar gente es del mostrador (Administración y
 * Recepción); las instructoras la consultan y marcan la asistencia de SUS
 * clases. RLS y `marcar_asistencia` lo vuelven a impedir.
 *
 * El `<h1>` va `sr-only` porque el visible lo pone `AdminTopbar` desde la ruta.
 */
export default async function ClasesPage() {
  const hoy = hoyEnBogota();
  const usuario = await getUsuarioActual();
  const puedeEditar =
    usuario?.rol === "Administración" || usuario?.rol === "Recepción";

  const [clases, instructoras, clientes, miEquipoId] = await Promise.all([
    getClases(hoy, horaEnBogota()),
    getInstructoras(),
    // La lista para apuntar gente: solo hace falta a quien puede apuntar.
    puedeEditar ? getClientes() : Promise.resolve([]),
    // La instructora de una clase marca su asistencia (y la base lo comprueba).
    getMiEquipoId(),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <h1 className="sr-only">Clases</h1>
      <PanelClases
        clases={clases}
        instructoras={instructoras}
        clientes={clientes.map((c) => ({ id: c.id, nombre: c.nombre, estado: c.estado }))}
        puedeEditar={puedeEditar}
        miEquipoId={miEquipoId}
        hoy={hoy}
      />
    </div>
  );
}
