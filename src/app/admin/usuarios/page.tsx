import PanelUsuarios from "@/components/admin/usuarios/PanelUsuarios";
import { getClientes, getConteoEstados, getEquipo } from "@/lib/admin/queries";

export default function UsuariosPage() {
  return (
    <div className="mx-auto w-full max-w-[1440px]">
      {/* El <h1> visible lo pone AdminTopbar desde la ruta; este solo evita
          dejar huérfano el árbol de encabezados de la página. */}
      <h1 className="sr-only">Usuarios</h1>
      <PanelUsuarios
        clientes={getClientes()}
        equipo={getEquipo()}
        conteos={getConteoEstados()}
      />
    </div>
  );
}
