import SeccionPendiente from "@/components/admin/SeccionPendiente";

export default function PlanesPage() {
  return (
    <SeccionPendiente
      descripcion="Las modalidades que vende el estudio y sus condiciones."
      puntos={[
        "Catálogo de planes: mensual, trimestral, pack de 10 clases y clase suelta",
        "Precio, vigencia y número de clases incluidas en cada uno",
        "Cuántos clientes tiene cada plan y cuánto factura",
        "Activar, desactivar o cambiar precios sin tocar código",
        "Promociones y descuentos por temporada",
      ]}
    />
  );
}
