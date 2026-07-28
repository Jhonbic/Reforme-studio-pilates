import PanelClases from "@/components/admin/clases/PanelClases";
import { getClases, getHoy, getInstructoras } from "@/lib/admin/queries";

/**
 * Agenda de clases.
 *
 * Página de servidor: pide los datos y los baja a `PanelClases`, que es de
 * cliente porque el día elegido, el filtro y los diálogos son estado local.
 *
 * ⚠️ **La agenda entera viaja al navegador de una vez** (unas 250 clases: cinco
 * semanas de horario). Es la misma decisión que el libro de pagos y el listado
 * de clientes: cambiar de día es instantáneo y la ruta sigue saliendo
 * `○ Static`. Con base de datos, `getClases()` recibirá un rango de fechas y
 * esta página no se entera.
 *
 * ⚠️ **Nada de lo que se hace aquí se guarda**: crear, editar, cancelar y
 * eliminar avisan de ello al ejecutarse. El horario vive en `mock.ts`.
 *
 * El `<h1>` va `sr-only` porque el visible lo pone `AdminTopbar` desde la ruta:
 * dos encabezados iguales, uno encima de otro, es lo que se corrigió al quitar
 * el `titulo` de `SeccionPendiente`.
 */
export default function ClasesPage() {
  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <h1 className="sr-only">Clases</h1>
      <PanelClases
        clases={getClases()}
        instructoras={getInstructoras()}
        hoy={getHoy()}
      />
    </div>
  );
}
