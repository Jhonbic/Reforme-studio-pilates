import Link from "next/link";
import Card from "./Card";
import GraficaIngresos from "./GraficaIngresos";
import Variacion from "./Variacion";
import { formatearValor } from "@/lib/admin/format";
import type { Indicador, MesFinanciero } from "@/lib/admin/types";

type Props = {
  indicador: Indicador;
  meses: MesFinanciero[];
  /** Para el reparto en la rejilla del dashboard. */
  className?: string;
};

/**
 * Tarjeta principal del dashboard: la cifra del mes y su serie histórica en el
 * mismo sitio.
 *
 * Antes eran dos bloques separados —una StatTile "Ingresos del mes" y una
 * ChartCard "Ingresos por mes"— que contaban el mismo dato dos veces con el
 * mismo peso visual. Juntos y en oscuro, se convierten en el ancla de la
 * página: lo primero que se mira.
 *
 * La cifra grande y su variación NO dependen del filtro de la gráfica: son
 * siempre el mes en curso frente al anterior. Cambiar el periodo mira la
 * tendencia, no redefine cuánto se facturó este mes.
 */
export default function TarjetaIngresos({
  indicador,
  meses,
  className = "",
}: Props) {
  const { etiqueta, valor, formato, variacion, subirEsBueno, detalle } =
    indicador;

  return (
    <Card tono="oscuro" fx className={`flex flex-col ${className}`}>
      {/* `pr-32`: el selector de periodo va superpuesto arriba a la derecha y
          en móvil se le echaría encima al eyebrow. */}
      <p className="eyebrow pr-32 text-dorado-light">{etiqueta}</p>

      <p className="mt-3 font-display text-4xl tabular-nums leading-none text-arena sm:text-5xl xl:text-6xl">
        {formatearValor(valor, formato)}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <Variacion
          valor={variacion}
          subirEsBueno={subirEsBueno}
          tono="oscuro"
        />
        <span className="text-beige/75">{detalle}</span>
      </div>

      <GraficaIngresos meses={meses}>
        <Link
          href="/admin/finanzas"
          className="mt-5 inline-flex min-h-[44px] items-center gap-2 self-start rounded-full border border-dorado/60 px-5 text-sm text-dorado-light transition-colors duration-300 hover:border-dorado hover:bg-dorado hover:text-verde-900"
        >
          Ver finanzas
          <span aria-hidden="true">→</span>
        </Link>
      </GraficaIngresos>
    </Card>
  );
}
