import FormularioAlta from "@/components/admin/usuarios/FormularioAlta";
import { getClientes } from "@/lib/admin/queries";
import { claveNombre } from "@/lib/validacion";

export default function NuevoClientePage() {
  const documentosExistentes: Record<string, string> = {};
  const nombresExistentes: Record<string, string> = {};
  for (const c of getClientes()) {
    documentosExistentes[c.identificacion] = c.nombre;
    nombresExistentes[claveNombre(c.nombre)] = c.nombre;
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="sr-only">Nuevo cliente</h1>

      <FormularioAlta
        documentosExistentes={documentosExistentes}
        nombresExistentes={nombresExistentes}
      />
    </div>
  );
}
