"use client";

import { useId, useState } from "react";
import Card from "./Card";
import CardHeader from "./CardHeader";
import TablaDeDatos from "./TablaDeDatos";
import GroupedBars from "./charts/GroupedBars";
import HBars from "./charts/HBars";
import { moneda } from "@/lib/admin/format";
import type { GastoCategoria, MesFinanciero } from "@/lib/admin/types";

const C1 = "var(--color-chart-1)";
const C2 = "var(--color-chart-2)";

const VISTAS = [
  {
    id: "ingresos",
    etiqueta: "Ingresos frente a gastos",
    descripcion:
      "Las dos series comparten un mismo eje en pesos. La distancia entre barras es la utilidad del mes.",
  },
  {
    id: "gastos",
    etiqueta: "Gastos por categoría",
    descripcion:
      "La marca vertical señala el presupuesto asignado a cada categoría este mes.",
  },
] as const;

type Vista = (typeof VISTAS)[number]["id"];

/**
 * Las dos vistas contables del dashboard, en una sola tarjeta.
 *
 * ⚠️ **Un `<select>` y no dos tarjetas.** Las dos responden a la misma
 * pregunta —«¿en qué se está yendo el dinero?»— y puestas una al lado de la
 * otra se leían como cuatro series distintas que hay que cruzar mentalmente.
 * Alternándolas, cada una ocupa el ancho completo y se compara **contra sí
 * misma** en el tiempo, que es como se leen.
 *
 * ⚠️ `<select>` nativo, igual que los filtros del listado y por el mismo
 * motivo: en móvil abre el selector del sistema, y trae teclado y
 * accesibilidad sin escribir nada. Un desplegable propio habría que mantenerlo.
 *
 * ⚠️ La **tabla de datos cambia con el gráfico**. Es su equivalente accesible:
 * si enseñara siempre la misma, dejaría de serlo para una de las dos vistas.
 */
export default function GraficaContable({
  meses,
  gastos,
  className = "",
}: {
  meses: MesFinanciero[];
  gastos: GastoCategoria[];
  className?: string;
}) {
  const [vista, setVista] = useState<Vista>("ingresos");
  const idSelect = useId();
  const actual = VISTAS.find((v) => v.id === vista) ?? VISTAS[0];

  const tabla =
    vista === "ingresos"
      ? {
          cabeceras: ["Mes", "Ingresos", "Gastos", "Utilidad"],
          filas: meses.map((m) => [
            `${m.mes} ${m.anio}`,
            moneda(m.ingresos),
            moneda(m.gastos),
            moneda(m.ingresos - m.gastos),
          ]),
        }
      : {
          cabeceras: ["Categoría", "Gastado", "Presupuesto", "Desviación"],
          filas: gastos.map((g) => [
            g.categoria,
            moneda(g.importe),
            moneda(g.presupuesto),
            `${g.importe > g.presupuesto ? "+" : ""}${moneda(g.importe - g.presupuesto)}`,
          ]),
        };

  return (
    <Card className={className}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardHeader titulo={actual.etiqueta} descripcion={actual.descripcion} />

        <label className="shrink-0">
          {/* La etiqueta va oculta: el `<select>` muestra ya el nombre de la
              vista, y un rótulo «Vista» encima solo repetiría lo que se lee
              debajo. Pero tiene que existir para quien usa lector. */}
          <span className="sr-only" id={idSelect}>
            Qué gráfico mostrar
          </span>
          <select
            aria-labelledby={idSelect}
            value={vista}
            onChange={(e) => setVista(e.target.value as Vista)}
            className="min-h-[44px] rounded-full border border-beige bg-white px-4 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado/60"
          >
            {VISTAS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.etiqueta}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5">
        {vista === "ingresos" ? (
          <GroupedBars
            datos={meses.map((m) => ({
              label: m.mes,
              valores: [m.ingresos, m.gastos],
            }))}
            series={[
              { nombre: "Ingresos", color: C1 },
              { nombre: "Gastos", color: C2 },
            ]}
            formato="moneda"
          />
        ) : (
          <HBars
            datos={gastos.map((g) => ({
              label: g.categoria,
              value: g.importe,
              referencia: g.presupuesto,
            }))}
            color={C2}
            formatoValor={moneda}
            etiquetaReferencia="Presupuesto del mes"
          />
        )}
      </div>

      <TablaDeDatos tabla={tabla} />
    </Card>
  );
}
