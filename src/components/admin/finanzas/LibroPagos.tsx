"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Paginacion from "@/components/admin/usuarios/Paginacion";
import {
  csvPagos,
  descargarCsv,
} from "@/components/admin/usuarios/exportar";
import { useToast } from "@/context/ToastContext";
import { fecha, moneda, numero } from "@/lib/admin/format";
import type { MetodoPago, Pago } from "@/lib/admin/types";
import { normalizar } from "@/lib/validacion";

const POR_PAGINA = 15;

const SELECT =
  "min-h-[44px] rounded-full border border-beige bg-white px-4 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado/60";

const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center gap-2 overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde";

const METODOS: (MetodoPago | "Todos")[] = [
  "Todos",
  "Nequi",
  "Transferencia",
  "Efectivo",
  "Tarjeta",
];

/* Los periodos van en días para poder compararlos con una resta. «Este mes» no
   está: sería el único que no se puede expresar así, y con `HOY` congelado en
   el mock resultaría indistinguible de «últimos 30 días». */
const PERIODOS = [
  { valor: 30, etiqueta: "Últimos 30 días" },
  { valor: 90, etiqueta: "Últimos 90 días" },
  { valor: 180, etiqueta: "Últimos 6 meses" },
  { valor: 0, etiqueta: "Todo el histórico" },
] as const;

/** Diferencia en días entre dos fechas ISO corto, sin construir `Date`. */
function diasEntre(desde: string, hasta: string): number {
  return Math.round(
    (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) /
      86_400_000,
  );
}

/**
 * Libro de pagos con filtros.
 *
 * Sigue la misma arquitectura que el listado de Usuarios, y a propósito: filtra
 * **en el cliente** sobre un array ya cargado, sin `debounce` (no hay petición
 * que ahorrar) y sin llevar el estado a la URL (leer `searchParams` volvería la
 * página dinámica y el panel dejaría de compilar `○ Static`). Cuando haya base
 * de datos y miles de pagos, ese es el momento de subirlo todo al servidor.
 *
 * ⚠️ El **total filtrado se recalcula con los filtros**, no es una constante.
 * Un libro que enseña 12 movimientos y una suma que no es la de esos 12 no
 * sirve para cuadrar nada, que es justo para lo que se abre un libro.
 */
export default function LibroPagos({ pagos, hoy }: { pagos: Pago[]; hoy: string }) {
  const { mostrarAviso } = useToast();
  const [busqueda, setBusqueda] = useState("");
  const [metodo, setMetodo] = useState<MetodoPago | "Todos">("Todos");
  const [dias, setDias] = useState<number>(90);
  const [pagina, setPagina] = useState(1);

  /* Cualquier cambio de filtro vuelve a la página 1: si estabas en la 5 y al
     filtrar solo quedan 2, la lista se vería vacía sin explicación. */
  function filtrar<T>(set: (v: T) => void) {
    return (v: T) => {
      set(v);
      setPagina(1);
    };
  }

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return pagos.filter((p) => {
      if (metodo !== "Todos" && p.metodo !== metodo) return false;
      if (dias > 0 && diasEntre(p.fecha, hoy) > dias) return false;
      if (q && !normalizar(p.cliente).includes(q)) return false;
      return true;
    });
  }, [pagos, busqueda, metodo, dias, hoy]);

  const total = filtrados.length;
  const suma = filtrados.reduce((t, p) => t + p.importe, 0);
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;

  function exportar() {
    descargarCsv(`pagos-${hoy}.csv`, csvPagos(filtrados));
    mostrarAviso(
      `Se descargaron ${numero(total)} pagos por ${moneda(suma)}.`,
      "success",
    );
  }

  const hayFiltros = busqueda !== "" || metodo !== "Todos" || dias !== 90;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-b border-beige px-5 py-4 sm:px-6">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Buscar por cliente</span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => filtrar(setBusqueda)(e.target.value)}
            placeholder="Buscar por cliente…"
            className="min-h-[44px] w-full rounded-full border border-beige bg-white px-5 text-sm text-verde-700 placeholder:text-verde-300 transition-colors duration-300 hover:border-dorado/60"
          />
        </label>

        <label>
          <span className="sr-only">Periodo</span>
          <select
            value={dias}
            onChange={(e) => filtrar(setDias)(Number(e.target.value))}
            className={SELECT}
          >
            {PERIODOS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.etiqueta}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Método de pago</span>
          <select
            value={metodo}
            onChange={(e) =>
              filtrar(setMetodo)(e.target.value as MetodoPago | "Todos")
            }
            className={SELECT}
          >
            {METODOS.map((m) => (
              <option key={m} value={m}>
                {m === "Todos" ? "Todos los métodos" : m}
              </option>
            ))}
          </select>
        </label>

        <button type="button" onClick={exportar} className={BOTON}>
          <span className="control-sheen" aria-hidden="true" />
          <span aria-hidden="true">↓</span>
          Exportar
        </button>
      </div>

      {/* El total de lo filtrado, junto a los filtros que lo producen. Es la
          cifra por la que se abre un libro, así que no puede estar al final
          detrás de quince filas. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-beige bg-arena/40 px-5 py-3 sm:px-6">
        <p className="text-sm text-verde-300">
          {numero(total)} {total === 1 ? "movimiento" : "movimientos"}
        </p>
        <p className="font-display text-xl tabular-nums text-verde">
          {moneda(suma)}
        </p>
      </div>

      {total === 0 ? (
        <div className="px-5 py-12 text-center sm:px-6">
          <p className="text-verde-300">
            Ningún pago coincide con estos filtros.
          </p>
          {hayFiltros && (
            <button
              type="button"
              onClick={() => {
                setBusqueda("");
                setMetodo("Todos");
                setDias(0);
                setPagina(1);
              }}
              className={`${BOTON} mt-4`}
            >
              <span className="control-sheen" aria-hidden="true" />
              Ver todo el histórico
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Cabecera de columnas solo en escritorio y `aria-hidden`: esto no es
              una <table> —la fila entera es un enlace— así que un lector no
              relacionaría rótulo y celda. Cada fila lleva sus propios `sr-only`.
              Mismo patrón que `CabeceraLista` en Usuarios. */}
          <div
            aria-hidden="true"
            className="hidden grid-cols-[6rem_1fr_9rem_8rem_7rem] gap-4 border-b border-beige px-6 py-2 text-xs uppercase tracking-[0.14em] text-verde-300 md:grid"
          >
            <span>Fecha</span>
            <span>Cliente</span>
            <span>Plan</span>
            <span>Método</span>
            <span className="text-right">Importe</span>
          </div>

          <ul className="divide-y divide-beige">
            {filtrados.slice(inicio, inicio + POR_PAGINA).map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/usuarios/${p.clienteId}`}
                  className="grid min-h-[56px] grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3 transition-colors duration-200 hover:bg-arena/70 sm:px-6 md:grid-cols-[6rem_1fr_9rem_8rem_7rem]"
                >
                  <span className="order-2 text-xs tabular-nums text-verde-300 md:order-none md:text-sm">
                    <span className="md:sr-only">Pagado el </span>
                    {fecha(p.fecha)}
                  </span>

                  <span className="order-1 min-w-0 truncate text-verde md:order-none">
                    {p.cliente}
                  </span>

                  <span className="order-3 truncate text-xs text-verde-300 md:order-none md:text-sm md:text-verde-700">
                    {p.plan}
                  </span>

                  <span className="order-4 truncate text-xs text-verde-300 md:order-none md:text-sm">
                    <span className="md:sr-only">Método: </span>
                    {p.metodo}
                  </span>

                  <span className="order-1 shrink-0 tabular-nums text-verde-700 md:order-none md:text-right">
                    {moneda(p.importe)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <Paginacion
            pagina={paginaActual}
            totalPaginas={totalPaginas}
            total={total}
            desde={inicio + 1}
            hasta={Math.min(inicio + POR_PAGINA, total)}
            onPagina={setPagina}
            sustantivo="movimientos"
          />
        </>
      )}
    </>
  );
}
