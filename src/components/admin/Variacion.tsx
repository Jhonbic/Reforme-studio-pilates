import { variacion as fmtVariacion } from "@/lib/admin/format";
import type { TonoCard } from "./Card";

type Props = {
  /** `null` = no hay mes anterior con el que comparar → no se pinta nada. */
  valor: number | null;
  /**
   * Si subir es la buena noticia. No se puede deducir del signo: en "Cartera
   * pendiente" subir es malo, en "Ingresos" es bueno.
   */
  subirEsBueno?: boolean;
  tono?: TonoCard;
  className?: string;
};

/**
 * Indicador de variación respecto al periodo anterior.
 *
 * Un solo sitio decide qué es "bueno" y con qué color se pinta. Antes esta
 * misma lógica estaba escrita tres veces (StatTile, TarjetaIngresos y la
 * tarjeta de tasa de renovación, que además llevaba la flecha a mano y por eso
 * habría seguido diciendo ▲ aunque el dato bajara).
 *
 * La variación **nunca se codifica solo con color**: van flecha y signo, para
 * que se entienda también sin distinguir el verde del rojo.
 */
export default function Variacion({
  valor,
  subirEsBueno = true,
  tono = "claro",
  className = "",
}: Props) {
  if (valor === null) return null;

  const sube = valor > 0;
  const baja = valor < 0;
  const esBueno = sube ? subirEsBueno : baja ? !subirEsBueno : null;

  // Sobre el verde de marca los estados normales se hunden (el ok es verde
  // sobre verde): en tono oscuro se usan las variantes claras.
  const oscuro = tono === "oscuro";
  const color =
    esBueno === null
      ? oscuro
        ? "text-beige/75"
        : "text-verde-300"
      : esBueno
        ? oscuro
          ? "text-[var(--color-estado-ok-claro)]"
          : "text-[var(--color-estado-ok)]"
        : oscuro
          ? "text-[var(--color-estado-grave-claro)]"
          : "text-[var(--color-estado-grave)]";

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium tabular-nums ${color} ${className}`}
    >
      <span aria-hidden="true">{sube ? "▲" : baja ? "▼" : "—"}</span>
      {fmtVariacion(valor)}
    </span>
  );
}
