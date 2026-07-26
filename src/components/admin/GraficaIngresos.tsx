"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import LineChart from "./charts/LineChart";
import TablaDeDatos from "./TablaDeDatos";
import { moneda } from "@/lib/admin/format";
import type { MesFinanciero } from "@/lib/admin/types";

type Props = {
  meses: MesFinanciero[];
  /** Se pinta entre la gráfica y la tabla de datos (el CTA de la tarjeta). */
  children?: ReactNode;
};

/** Atajos, del más largo al más corto. */
const RANGOS = [12, 6, 3];

/** Una línea con dos puntos ya cuenta algo; con uno, no. */
const MINIMO = 2;

const largo = (m: MesFinanciero) => `${m.mes} ${m.anio}`;
const corto = (m: MesFinanciero) => `${m.mes} ${String(m.anio).slice(-2)}`;

/**
 * Serie de ingresos con selector de periodo.
 *
 * Es la única parte interactiva de la tarjeta héroe, por eso vive aparte: así
 * `TarjetaIngresos` sigue siendo componente de servidor y solo cruza al cliente
 * lo que de verdad necesita estado.
 *
 * ⚠️ El selector va **superpuesto** (`absolute`) en la esquina superior derecha,
 * no en el flujo: abrirlo no puede empujar la gráfica ni estirar la tarjeta,
 * porque eso descuadraría toda su fila de la rejilla.
 *
 * La tabla de datos se filtra CON la gráfica a propósito: es su equivalente
 * accesible, y si mostraran periodos distintos dejaría de serlo.
 */
export default function GraficaIngresos({ meses, children }: Props) {
  const ultimo = meses.length - 1;

  /* UNA sola fuente de verdad: el par [desde, hasta]. Los atajos no son un
     modo aparte, solo escriben ese par. Así nunca se puede dar el caso de que
     el atajo diga una cosa y el rango explícito otra. */
  const [desde, setDesde] = useState(Math.max(0, meses.length - RANGOS[0]));
  const [hasta, setHasta] = useState(ultimo);
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  // Cerrar al pulsar fuera o con Escape: si no, el panel se queda encima de la
  // gráfica tapando justo lo que se quiere mirar.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  const atajos = useMemo(
    () => RANGOS.filter((n) => n <= meses.length),
    [meses.length],
  );

  /* Un atajo está activo cuando el rango elegido coincide exactamente con él:
     termina en el último mes y tiene ese número de meses. */
  const atajoActivo = atajos.find(
    (n) => hasta === ultimo && hasta - desde + 1 === n,
  );

  /* Los `<select>` se agrupan por año con `<optgroup>`. Es lo que hace que
     "de qué mes de qué año" se lea de un vistazo, y escala solo el día que la
     BD devuelva varios años en vez de doce meses. */
  const gruposPorAnio = useMemo(() => {
    const grupos: { anio: number; indices: number[] }[] = [];
    meses.forEach((m, i) => {
      const ult = grupos.at(-1);
      if (ult && ult.anio === m.anio) ult.indices.push(i);
      else grupos.push({ anio: m.anio, indices: [i] });
    });
    return grupos;
  }, [meses]);

  const datos = meses.slice(desde, hasta + 1);

  /* Los rangos imposibles no se validan: no se pueden ni elegir. "Desde" solo
     ofrece meses que dejen sitio al mínimo, y "Hasta" igual. Así no hay ningún
     mensaje de error que mostrar. */
  const selectorMes = (
    valor: number,
    onChange: (i: number) => void,
    permitido: (i: number) => boolean,
    etiqueta: string,
    id: string,
  ) => (
    <label htmlFor={id} className="block">
      <span className="text-xs text-beige/60">{etiqueta}</span>
      <select
        id={id}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 min-h-[44px] w-full rounded-lg border border-verde-300/40 bg-verde-500 px-2 text-sm text-arena"
      >
        {gruposPorAnio.map((g) => {
          const opciones = g.indices.filter(permitido);
          if (opciones.length === 0) return null;
          return (
            <optgroup key={g.anio} label={String(g.anio)}>
              {opciones.map((i) => (
                <option key={i} value={i}>
                  {largo(meses[i])}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </label>
  );

  return (
    <>
      {/* `absolute` contra la tarjeta (que es `relative` por la capa de
          efectos). Right/top igualan el relleno de la Card. */}
      <div
        ref={caja}
        className="absolute right-5 top-5 z-20 sm:right-6 sm:top-6"
      >
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-haspopup="true"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-arena/25 px-4 text-sm text-beige transition-colors duration-300 hover:border-dorado hover:text-dorado-light"
        >
          {/* La etiqueta dice SIEMPRE lo que se está viendo, nunca un vago
              "Personalizado". */}
          {atajoActivo
            ? `${atajoActivo} meses`
            : `${corto(meses[desde])} – ${corto(meses[hasta])}`}
          <span
            aria-hidden="true"
            className={`text-xs transition-transform duration-300 ${
              abierto ? "rotate-180" : ""
            }`}
          >
            ▾
          </span>
        </button>

        {abierto && (
          <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-verde-500 bg-verde-700 p-3 text-left shadow-lift">
            <p className="text-xs uppercase tracking-wider text-beige/60">
              Últimos
            </p>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {atajos.map((n) => {
                const activo = n === atajoActivo;
                return (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => {
                      setDesde(meses.length - n);
                      setHasta(ultimo);
                    }}
                    className={`flex min-h-[44px] items-center justify-center rounded-lg px-2 text-xs transition-colors duration-200 ${
                      activo
                        ? // Sobre dorado, el verde de marca se queda en 4.11:1
                          // y no llega al 4.5 de AA; la escala de profundidad sí.
                          "bg-dorado text-verde-900"
                        : "border border-arena/20 text-beige hover:border-dorado hover:text-dorado-light"
                    }`}
                  >
                    {n} meses
                  </button>
                );
              })}
            </div>

            <div className="my-3 border-t border-verde-500" />

            <p className="text-xs uppercase tracking-wider text-beige/60">
              Rango exacto
            </p>
            <div className="mt-1.5 grid gap-2">
              {selectorMes(
                desde,
                setDesde,
                (i) => i <= hasta - (MINIMO - 1),
                "Desde",
                "ingresos-desde",
              )}
              {selectorMes(
                hasta,
                setHasta,
                (i) => i >= desde + (MINIMO - 1),
                "Hasta",
                "ingresos-hasta",
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <LineChart
          serie="Ingresos"
          tono="oscuro"
          datos={datos.map((m) => ({ label: m.mes, value: m.ingresos }))}
          formato="moneda"
        />
      </div>

      {children}

      <TablaDeDatos
        tono="oscuro"
        tabla={{
          cabeceras: ["Mes", "Ingresos"],
          filas: datos.map((m) => [largo(m), moneda(m.ingresos)]),
        }}
      />
    </>
  );
}
