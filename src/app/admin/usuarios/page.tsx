import PanelUsuarios from "@/components/admin/usuarios/PanelUsuarios";
import {
  getClientes,
  getConteoEstados,
  getEquipo,
  getUsuarioActual,
} from "@/lib/admin/queries";

export default async function UsuariosPage() {
  const usuario = await getUsuarioActual();
  const esAdmin = usuario?.rol === "Administración";
  const [clientes, equipo] = await Promise.all([
    getClientes(),
    getEquipo(esAdmin),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <h1 className="sr-only">Usuarios</h1>
      <PanelUsuarios
        clientes={clientes}
        equipo={equipo}
        conteos={getConteoEstados(clientes)}
        esAdmin={esAdmin}
        correoActual={usuario?.correo ?? ""}
      />
    </div>
  );
}
