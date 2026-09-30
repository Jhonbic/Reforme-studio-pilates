import FormularioAlta from "@/components/admin/usuarios/FormularioAlta";
import { getClientes, getPlanes } from "@/lib/admin/queries";
import { claveNombre } from "@/lib/validacion";

export default async function NuevoClientePage() {
  /* ⚠️ El catálogo es el REAL (Supabase), no el de `mock.ts`: el plan que se
     elija aquí es el que acabará en `membresias.plan_id`. Solo los que se
     venden hoy — uno retirado conserva a sus clientes, pero no admite altas. */
  const planes = (await getPlanes()).filter((p) => p.seVende);

  const documentosExistentes: Record<string, string> = {};
  const nombresExistentes: Record<string, string> = {};
  const correosExistentes: Record<string, string> = {};
  for (const c of getClientes()) {
    documentosExistentes[c.identificacion] = c.nombre;
    nombresExistentes[claveNombre(c.nombre)] = c.nombre;
    correosExistentes[c.correo.trim().toLowerCase()] = c.nombre;
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="sr-only">Nuevo cliente</h1>

      <FormularioAlta
        documentosExistentes={documentosExistentes}
        nombresExistentes={nombresExistentes}
        correosExistentes={correosExistentes}
        planes={planes}
      />
    </div>
  );
}
