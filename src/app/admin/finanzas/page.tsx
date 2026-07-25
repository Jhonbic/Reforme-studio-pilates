import SeccionPendiente from "@/components/admin/SeccionPendiente";

export default function FinanzasPage() {
  return (
    <SeccionPendiente
      descripcion="El detalle contable. El Dashboard da el resumen; aquí se trabaja con el movimiento uno a uno."
      puntos={[
        "Libro de ingresos: cada pago con cliente, plan, método y fecha",
        "Registro de gastos por categoría, con comprobante adjunto",
        "Cierre de caja diario: cuadrar el efectivo contra lo digital",
        "Cartera detallada: quién debe, cuánto y desde cuándo",
        "Informes por periodo y exportación a Excel para la contadora",
        "Presupuesto anual y seguimiento de desviaciones",
      ]}
    />
  );
}
