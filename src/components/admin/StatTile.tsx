import { formatearValor } from "@/lib/admin/format";
import type { Indicador } from "@/lib/admin/types";
import Card from "./Card";
import Variacion from "./Variacion";

/**
 * Cifra de cabecera. Sin gráfico: cuando el dato es UN número, un número es la
 * mejor visualización — añadirle un gráfico solo lo estorba.
 */
export default function StatTile({ indicador }: { indicador: Indicador }) {
  const { etiqueta, valor, formato, variacion, subirEsBueno, detalle } =
    indicador;

  return (
    /* `sheen`: las tres cifras de cabecera son las únicas tarjetas sin tooltip
       ni contenido que se salga del marco, así que son las únicas donde se
       puede recortar con `overflow-hidden` sin romper nada. */
    <Card as="div" densidad="compacta" sheen>
      <p className="eyebrow text-verde-300">{etiqueta}</p>
      <p className="mt-3 font-display text-3xl tabular-nums leading-none text-verde sm:text-4xl">
        {formatearValor(valor, formato)}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <Variacion valor={variacion} subirEsBueno={subirEsBueno} />
        <span className="text-verde-300">{detalle}</span>
      </div>
    </Card>
  );
}
