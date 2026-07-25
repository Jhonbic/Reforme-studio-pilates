import { formatearValor, variacion as fmtVariacion } from "@/lib/admin/format";
import type { Indicador } from "@/lib/admin/types";
import Card from "./Card";

/**
 * Cifra de cabecera. Sin gráfico: cuando el dato es UN número, un número es la
 * mejor visualización — añadirle un gráfico solo lo estorba.
 *
 * La variación no se codifica solo con color: lleva flecha y signo, para que se
 * entienda también sin distinguir el verde del rojo.
 */
export default function StatTile({ indicador }: { indicador: Indicador }) {
  const { etiqueta, valor, formato, variacion, subirEsBueno, detalle } =
    indicador;

  const sube = variacion !== null && variacion > 0;
  const baja = variacion !== null && variacion < 0;
  const esBueno = sube ? subirEsBueno : baja ? !subirEsBueno : null;

  const colorVariacion =
    esBueno === null
      ? "text-verde-300"
      : esBueno
        ? "text-[var(--color-estado-ok)]"
        : "text-[var(--color-estado-grave)]";

  return (
    <Card as="div" densidad="compacta">
      <p className="eyebrow text-verde-300">{etiqueta}</p>
      <p className="mt-3 font-display text-3xl tabular-nums leading-none text-verde sm:text-4xl">
        {formatearValor(valor, formato)}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {variacion !== null && (
          <span
            className={`inline-flex items-center gap-1 font-medium tabular-nums ${colorVariacion}`}
          >
            <span aria-hidden="true">{sube ? "▲" : baja ? "▼" : "—"}</span>
            {fmtVariacion(variacion)}
          </span>
        )}
        <span className="text-verde-300">{detalle}</span>
      </div>
    </Card>
  );
}
