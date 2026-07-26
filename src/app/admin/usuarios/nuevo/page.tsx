import FormularioAlta from "@/components/admin/usuarios/FormularioAlta";
import { getClientes } from "@/lib/admin/queries";
import { claveNombre } from "@/lib/validacion";

/**
 * Alta manual de cliente.
 *
 * ⚠️ Contenedor **`max-w-5xl`, ni el `max-w-[1440px]` del resto del panel ni un
 * `max-w-3xl`**: a 1440px un campo de texto quedaría de 1300px e ilegible, pero a
 * 768px sobraba tantísimo margen a los lados que la pantalla parecía vacía. A
 * 1024px los campos emparejados miden ~490px, que se lee de un golpe de vista.
 *
 * No lee `searchParams` ni `headers` a propósito: así la ruta sigue compilando
 * como `○ Static` igual que las otras siete.
 */
export default function NuevoClientePage() {
  /* Se pasa documento → nombre, no la lista entera: es lo único que el
     formulario necesita para avisar de un duplicado, y cruza la frontera
     servidor→cliente como un objeto plano.
     ⚠️ Comprobar el duplicado aquí solo vale contra los datos de ejemplo. Con
     base de datos, esto lo tiene que decidir el servidor al guardar. */
  const documentosExistentes: Record<string, string> = {};
  const nombresExistentes: Record<string, string> = {};
  for (const c of getClientes()) {
    documentosExistentes[c.identificacion] = c.nombre;
    nombresExistentes[claveNombre(c.nombre)] = c.nombre;
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* El <h1> visible lo pone AdminTopbar desde la ruta. */}
      {/* El <h1> visible y el «← Usuarios» los pone AdminTopbar desde la ruta. */}
      <h1 className="sr-only">Nuevo cliente</h1>

      <FormularioAlta
        documentosExistentes={documentosExistentes}
        nombresExistentes={nombresExistentes}
      />
    </div>
  );
}
