"use client";

import { useState } from "react";
import Card from "@/components/admin/Card";
import CardHeader from "@/components/admin/CardHeader";
import StatTile from "@/components/admin/StatTile";
import Variacion from "@/components/admin/Variacion";
import { calcularVariacion, moneda, porcentaje } from "@/lib/admin/format";
import {
  enPeriodo,
  esteMes,
  etiquetaPeriodo,
  mesesDe,
  periodoAnterior,
  type Periodo,
} from "@/lib/admin/periodo";
import type {
  CategoriaGasto,
  Movimiento,
  Presupuesto,
} from "@/lib/admin/types";
import DesgloseGastos from "./DesgloseGastos";
import DesgloseIngresos from "./DesgloseIngresos";
import LibroMovimientos from "./LibroMovimientos";
import RegistrarGasto from "./RegistrarGasto";
import SelectorPeriodo from "./SelectorPeriodo";

type Props = {
  movimientos: Movimiento[];
  presupuestos: Presupuesto[];
  /** Hoy en Bogotá, calculado en el servidor. */
  hoy: string;
};

/** Lo que entra, lo que sale y lo que queda en un periodo. */
function cuentas(movs: Movimiento[]) {
  let ingresos = 0;
  let gastos = 0;
  for (const m of movs) {
    if (m.tipo === "cobro") ingresos += m.importe;
    else gastos += m.importe;
  }
  const utilidad = ingresos - gastos;
  // Con ingresos a 0 no hay margen: la pregunta no aplica, y eso no es «0 %».
  const margen = ingresos ? (utilidad / ingresos) * 100 : null;
  return { ingresos, gastos, utilidad, margen };
}

/**
 * Finanzas: un periodo, y todo lo de la pantalla le obedece.
 *
 * Estructura tomada de JainSportBox (decisión del usuario): selector de
 * periodo arriba → cifras → de dónde entra y a dónde se va → libro. Lo que NO
 * se tomó es su aspecto (rojo, gris, letra muy gruesa): aquí manda la marca.
 *
 * ⚠️ **Todo se calcula en el cliente** sobre los movimientos que ya llegaron:
 * cambiar de periodo es instantáneo y no pide nada al servidor. Ver
 * `getMovimientos()` para cuándo deja de tener sentido.
 */
export default function PanelFinanzas({ movimientos, presupuestos, hoy }: Props) {
  const [periodo, setPeriodo] = useState<Periodo>(() => esteMes(hoy));

  const anterior = periodoAnterior(periodo);
  const etiqueta = etiquetaPeriodo(periodo, hoy);
  const etiquetaAnterior = etiquetaPeriodo(anterior, hoy);

  const delPeriodo = movimientos.filter((m) => enPeriodo(m.fecha, periodo));
  const actual = cuentas(delPeriodo);
  const previo = cuentas(movimientos.filter((m) => enPeriodo(m.fecha, anterior)));

  const meses = new Set(mesesDe(periodo));
  const presupuesto = new Map<CategoriaGasto, number>();
  for (const p of presupuestos) {
    if (!meses.has(p.mes)) continue;
    presupuesto.set(p.categoria, (presupuesto.get(p.categoria) ?? 0) + p.importe);
  }

  const cobros = delPeriodo.filter(
    (m): m is Extract<Movimiento, { tipo: "cobro" }> => m.tipo === "cobro",
  );
  const gastos = delPeriodo.filter(
    (m): m is Extract<Movimiento, { tipo: "gasto" }> => m.tipo === "gasto",
  );

  return (
    <div className="space-y-4 xl:space-y-5">
      {/* El alta de gasto va arriba, en la misma fila que el periodo: es la
          única acción de la pantalla. Exportar vive en el libro, porque
          exporta lo que el libro tiene filtrado. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <SelectorPeriodo periodo={periodo} hoy={hoy} onCambio={setPeriodo} />
        <RegistrarGasto hoy={hoy} />
      </div>

      {/* Anuncia el cambio de periodo a quien usa lector de pantalla: las
          cifras cambian todas a la vez y en silencio. */}
      <p className="sr-only" role="status">
        Mostrando {etiqueta}
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12 xl:gap-5">
        {/* La utilidad es la cifra principal: es lo que queda, la pregunta
            con la que se entra a Finanzas. Oscura y con motas, como la de
            ingresos del dashboard: una por pantalla. */}
        <Card
          tono="oscuro"
          fx
          className="flex flex-col md:col-span-6 xl:col-span-6"
        >
          <p className="eyebrow text-dorado-light">Utilidad · {etiqueta}</p>
          <p className="mt-3 font-cifra text-4xl leading-none text-arena sm:text-5xl">
            {actual.utilidad > 0 ? "+" : actual.utilidad < 0 ? "−" : ""}
            {moneda(Math.abs(actual.utilidad))}
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-4 text-xs">
            <span className="text-beige/90">
              Margen{" "}
              {actual.margen === null ? "—" : porcentaje(actual.margen)}
            </span>
            {/* ⚠️ El margen se compara en PUNTOS, no en variación relativa:
                de 30 % a 33 % son 3 puntos. Decir «+10 %» ahí se confundiría
                con el propio margen. */}
            <Variacion
              valor={
                actual.margen !== null && previo.margen !== null
                  ? actual.margen - previo.margen
                  : null
              }
              subirEsBueno
              tono="oscuro"
            />
            <span className="text-beige/75">frente a {etiquetaAnterior}</span>
          </div>
        </Card>

        <div className="md:col-span-3 xl:col-span-3">
          <StatTile
            indicador={{
              etiqueta: "Ingresos",
              valor: actual.ingresos,
              formato: "moneda",
              variacion: calcularVariacion(actual.ingresos, previo.ingresos),
              subirEsBueno: true,
              detalle: `frente a ${etiquetaAnterior}`,
            }}
          />
        </div>
        <div className="md:col-span-3 xl:col-span-3">
          <StatTile
            indicador={{
              etiqueta: "Gastos",
              valor: actual.gastos,
              formato: "moneda",
              variacion: calcularVariacion(actual.gastos, previo.gastos),
              // Gastar más que antes no es una buena noticia.
              subirEsBueno: false,
              detalle: `frente a ${etiquetaAnterior}`,
            }}
          />
        </div>

        <DesgloseIngresos
          cobros={cobros}
          etiqueta={etiqueta}
          className="md:col-span-6 xl:col-span-6"
        />
        <DesgloseGastos
          gastos={gastos}
          presupuesto={presupuesto}
          etiqueta={etiqueta}
          className="md:col-span-6 xl:col-span-6"
        />

        <Card densidad="plana" className="md:col-span-6 xl:col-span-12">
          <div className="p-5 sm:p-6">
            <CardHeader
              titulo="Libro de movimientos"
              descripcion={`Cobros y gastos de ${etiqueta}. Cada cobro lleva a la ficha del cliente.`}
            />
          </div>
          <LibroMovimientos
            movimientos={delPeriodo}
            etiqueta={etiqueta}
            hoy={hoy}
          />
        </Card>
      </div>
    </div>
  );
}
