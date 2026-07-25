import SeccionPendiente from "@/components/admin/SeccionPendiente";

export default function UsuariosPage() {
  return (
    <SeccionPendiente
      descripcion="Gestión de las personas que entran al estudio: clientes y equipo."
      puntos={[
        "Listado de clientes con buscador, estado de membresía y filtro por plan",
        "Ficha individual: datos de contacto, historial de pagos y de asistencia",
        "Alta y edición manual de clientes (los que se apuntan en recepción)",
        "Clientes inactivos: sin reservar en 30 días, para recuperarlos",
        "Equipo del estudio: instructoras y personal administrativo, con sus permisos",
      ]}
    />
  );
}
