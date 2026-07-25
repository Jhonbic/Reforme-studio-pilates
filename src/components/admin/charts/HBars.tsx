export type BarraH = {
  label: string;
  value: number;
  /** Referencia opcional (p. ej. presupuesto) que se marca sobre la barra */
  referencia?: number;
};

type Props = {
  datos: BarraH[];
  color: string;
  formatoValor: (v: number) => string;
  /** Texto de la marca de referencia, si la hay */
  etiquetaReferencia?: string;
};

/**
 * Barras horizontales para comparar magnitudes entre categorías con nombre
 * largo (métodos de pago, categorías de gasto). Horizontal porque el texto se
 * lee de corrido, sin rotar etiquetas.
 *
 * Cada barra lleva su valor escrito al lado — no hace falta perseguir el eje, y
 * cumple la exigencia de etiqueta visible que impone el contraste del dorado.
 *
 * Sin estado ni interacción: el valor ya está escrito, un tooltip no añadiría
 * nada. Por eso puede renderizarse en el servidor.
 */
export default function HBars({
  datos,
  color,
  formatoValor,
  etiquetaReferencia,
}: Props) {
  const max = Math.max(...datos.flatMap((d) => [d.value, d.referencia ?? 0]));

  return (
    <div className="space-y-4">
      {datos.map((d) => {
        const pct = (d.value / max) * 100;
        const pctRef =
          d.referencia !== undefined ? (d.referencia / max) * 100 : null;
        const excedido = d.referencia !== undefined && d.value > d.referencia;

        return (
          <div key={d.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-verde-700">{d.label}</span>
              <span className="tabular-nums text-verde">
                {formatoValor(d.value)}
              </span>
            </div>
            <div className="relative mt-1.5 h-2.5 rounded-full bg-beige">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: color }}
              />
              {pctRef !== null && (
                <span
                  aria-hidden="true"
                  title={etiquetaReferencia}
                  className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-verde-700"
                  style={{ left: `${pctRef}%` }}
                />
              )}
            </div>
            {excedido && (
              <p className="mt-1 text-xs text-[var(--color-estado-grave)]">
                Por encima del presupuesto en{" "}
                {formatoValor(d.value - d.referencia!)}
              </p>
            )}
          </div>
        );
      })}

      {etiquetaReferencia && (
        <p className="flex items-center gap-2 pt-1 text-xs text-verde-300">
          <span
            aria-hidden="true"
            className="h-3 w-0.5 rounded-full bg-verde-700"
          />
          {etiquetaReferencia}
        </p>
      )}
    </div>
  );
}
