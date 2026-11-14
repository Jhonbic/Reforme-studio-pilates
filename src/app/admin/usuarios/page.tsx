import PanelUsuarios from "@/components/admin/usuarios/PanelUsuarios";
import { ESTADOS_MEMBRESIA } from "@/lib/admin/catalogos";
import { exigirSeccion } from "@/lib/admin/acceso";
import { getClientes, getConteoEstados, getEquipo } from "@/lib/admin/queries";

export default async function UsuariosPage({ searchParams }: PageProps<"/admin/usuarios">) {
  // La instructora no tiene Usuarios (ni en el menú): vuelve a su inicio.
  const usuario = await exigirSeccion("/admin/usuarios");
  const { estado } = await searchParams;
  /* Solo un estado que existe: `?estado=loquesea` abre la lista sin filtro en
     vez de dejarla vacía con un filtro que ninguna pastilla enseña. */
  const estadoInicial = ESTADOS_MEMBRESIA.find((e) => e === estado);

  const esAdmin = usuario.rol === "Administración";
  const [clientes, equipo] = await Promise.all([
    getClientes(),
    getEquipo(),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <h1 className="sr-only">Usuarios</h1>
      {/* `key`: si ya estás en Usuarios y entras por otro `?estado=` (la
          campana, el dashboard), el panel se monta de nuevo con ese filtro en
          vez de conservar el que tenía. */}
      <PanelUsuarios
        key={estadoInicial ?? "Todas"}
        clientes={clientes}
        equipo={equipo}
        conteos={getConteoEstados(clientes)}
        esAdmin={esAdmin}
        correoActual={usuario.correo}
        estadoInicial={estadoInicial}
      />
    </div>
  );
}
