import PanelUsuarios from "@/components/admin/usuarios/PanelUsuarios";
import { getClientes, getConteoEstados, getEquipo } from "@/lib/admin/queries";

export default async function UsuariosPage() {
  const clientes = await getClientes();

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <h1 className="sr-only">Usuarios</h1>
      <PanelUsuarios
        clientes={clientes}
        equipo={getEquipo()}
        conteos={getConteoEstados(clientes)}
      />
    </div>
  );
}
