import Card from "@/components/admin/Card";
import FormularioAlta from "@/components/admin/usuarios/FormularioAlta";
import { getClientes, getUsuarioActual } from "@/lib/admin/queries";
import { claveNombre } from "@/lib/validacion";

/**
 * Alta de cliente. Guarda en Supabase (`crearCliente` en
 * `lib/admin/acciones.ts`) desde oct 2026.
 *
 * ⚠️ Solo Administración y Recepción: RLS no deja insertar clientes a nadie
 * más. Se dice ANTES del formulario, no al enviarlo: dejar rellenar catorce
 * campos para luego decir «no puedes» es lo peor que se puede hacer.
 */
export default async function NuevoClientePage() {
  const usuario = await getUsuarioActual();
  if (usuario?.rol !== "Administración" && usuario?.rol !== "Recepción") {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="sr-only">Nuevo cliente</h1>
        <Card>
          <p className="font-display text-2xl text-verde">
            El alta de clientes es de recepción
          </p>
          <p className="mt-2 text-sm text-verde-700">
            Tu rol puede ver los clientes, pero no darlos de alta. Si alguien
            nuevo llega a clase, pídele a recepción que lo registre.
          </p>
        </Card>
      </div>
    );
  }

  // Para avisar de duplicados mientras se escribe. Es la foto de AHORA: si otra
  // persona da de alta al mismo cliente mientras tanto, lo frena la base
  // (documento único) y el formulario lo enseña en el campo.
  const documentosExistentes: Record<string, string> = {};
  const nombresExistentes: Record<string, string> = {};
  for (const c of await getClientes()) {
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
