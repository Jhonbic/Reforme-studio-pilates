import { notFound, redirect } from "next/navigation";
import FormularioAlta from "@/components/admin/usuarios/FormularioAlta";
import { getClientes, getDatosCliente, getUsuarioActual } from "@/lib/admin/queries";
import { claveNombre } from "@/lib/validacion";

/**
 * Editar los datos de un cliente. Es el MISMO formulario que el alta, con sus
 * mismas reglas (`editarCliente` reutiliza la validación de `crearCliente`):
 * un formulario de edición más permisivo dejaría colar lo que el alta impide.
 *
 * Solo Administración y Recepción; a los demás se les devuelve a la ficha.
 */
export default async function EditarClientePage({
  params,
}: PageProps<"/admin/usuarios/[id]/editar">) {
  const { id } = await params;
  const usuario = await getUsuarioActual();
  if (usuario?.rol !== "Administración" && usuario?.rol !== "Recepción") {
    redirect(`/admin/usuarios/${id}`);
  }

  const datos = await getDatosCliente(id);
  if (!datos) notFound();

  // Para avisar de duplicados mientras se escribe, SIN el propio cliente: si
  // no, su documento saldría como repetido.
  const documentosExistentes: Record<string, string> = {};
  const nombresExistentes: Record<string, string> = {};
  for (const c of await getClientes()) {
    if (c.id === id) continue;
    documentosExistentes[c.identificacion] = c.nombre;
    nombresExistentes[claveNombre(c.nombre)] = c.nombre;
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="sr-only">Editar datos de {datos.nombre}</h1>
      <FormularioAlta
        documentosExistentes={documentosExistentes}
        nombresExistentes={nombresExistentes}
        editar={{ id, datos }}
      />
    </div>
  );
}
