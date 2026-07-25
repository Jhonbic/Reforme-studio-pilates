import Link from "next/link";
import LineChart from "@/components/admin/charts/LineChart";
import Card from "./Card";
import TablaDeDatos from "./TablaDeDatos";
import {
  formatearValor,
  moneda,
  variacion as fmtVariacion,
} from "@/lib/admin/format";
import type { Indicador, MesFinanciero } from "@/lib/admin/types";

type Props = {
  indicador: Indicador;
  meses: MesFinanciero[];
  /** Para el reparto en la rejilla del dashboard. */
  className?: string;
};

/**
 * Tarjeta principal del dashboard: la cifra del mes y su serie de 12 meses en
 * el mismo sitio.
 *
 * Antes eran dos bloques separados —una StatTile "Ingresos del mes" y una
 * ChartCard "Ingresos por mes"— que contaban el mismo dato dos veces con el
 * mismo peso visual. Juntos y en oscuro, se convierten en el ancla de la
 * página: lo primero que se mira.
 */
export default function TarjetaIngresos({
  indicador,
  meses,
  className = "",
}: Props) {
  const { etiqueta, valor, formato, variacion, subirEsBueno, detalle } =
    indicador;

  const sube = variacion !== null && variacion > 0;
  const baja = variacion !== null && variacion < 0;
  const esBueno = sube ? subirEsBueno : baja ? !subirEsBueno : null;

  // Sobre verde-900 los colores de estado normales se hunden: se usan las
  // variantes claras. La flecha y el signo siguen llevando el significado.
  const colorVariacion =
    esBueno === null
      ? "text-beige/75"
      : esBueno
        ? "text-[var(--color-estado-ok-claro)]"
        : "text-[var(--color-estado-grave-claro)]";

  return (
    <Card tono="oscuro" className={`flex flex-col ${className}`}>
      <p className="eyebrow text-dorado-light">{etiqueta}</p>

      <p className="mt-3 font-display text-4xl tabular-nums leading-none text-arena sm:text-5xl xl:text-6xl">
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
        <span className="text-beige/75">{detalle}</span>
      </div>

      <div className="mt-6 flex-1">
        <LineChart
          serie="Ingresos"
          tono="oscuro"
          datos={meses.map((m) => ({ label: m.mes, value: m.ingresos }))}
          formato="moneda"
        />
      </div>

      <p className="mt-4 text-sm leading-relaxed text-beige/75">
        Últimos 12 meses. Sirve para ver la estacionalidad: enero sube por
        propósitos de año nuevo, mitad de año baja por vacaciones.
      </p>

      <Link
        href="/admin/finanzas"
        className="mt-5 inline-flex min-h-[44px] items-center gap-2 self-start rounded-full border border-dorado/60 px-5 text-sm text-dorado-light transition-colors hover:border-dorado hover:bg-dorado hover:text-verde-900"
      >
        Ver finanzas
        <span aria-hidden="true">→</span>
      </Link>

      <TablaDeDatos
        tono="oscuro"
        tabla={{
          cabeceras: ["Mes", "Ingresos"],
          filas: meses.map((m) => [`${m.mes} ${m.anio}`, moneda(m.ingresos)]),
        }}
      />
    </Card>
  );
}
