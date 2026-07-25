import Card from "./Card";

/**
 * Marcador para las secciones del panel que aún no se han construido.
 * Existe para que la navegación no lleve a un 404 mientras se diseñan una a una.
 */
export default function SeccionPendiente({
  descripcion,
  puntos,
}: {
  descripcion: string;
  /** Lo que se ha hablado que llevará, para no perder el hilo */
  puntos: string[];
}) {
  // El título de la sección lo pone `AdminTopbar` desde la ruta: repetirlo aquí
  // dejaba dos encabezados idénticos uno encima de otro.
  return (
    <div className="mx-auto max-w-3xl">
      <p className="leading-relaxed text-verde-700">{descripcion}</p>

      <Card className="mt-6">
        <h2 className="eyebrow text-verde-300">Previsto para esta sección</h2>
        <ul className="mt-4 space-y-3">
          {puntos.map((p) => (
            <li key={p} className="flex gap-3 text-sm text-verde-700">
              <span aria-hidden="true" className="text-dorado">
                ◆
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card tono="acento" densidad="compacta" className="mt-6">
        <p className="text-sm leading-relaxed">
          Sección todavía sin construir. Empezamos por el Dashboard; esta es la
          siguiente cuando la definamos.
        </p>
      </Card>
    </div>
  );
}
