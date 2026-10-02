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
      {/* ⚠️ Desde `sm` hay TRES cifras por fila, y a 768px cada tarjeta mide
          ~230px: «−$ 10.800.000» a 36px se salía y quedaba cortada (visto al
          validar la rejilla a 768). Entre `sm` y `xl` la letra sigue al ancho
          de la ventana, con 24px de mínimo y los 36px de antes de máximo. En
          móvil (una por fila) hay sitio de sobra y se queda en 30px. */}
      <p className="mt-3 font-cifra text-3xl leading-none text-verde sm:text-[clamp(1.5rem,3vw,2.25rem)]">
        {formatearValor(valor, formato)}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <Variacion valor={variacion} subirEsBueno={subirEsBueno} />
        <span className="text-verde-300">{detalle}</span>
      </div>
    </Card>
  );
}
