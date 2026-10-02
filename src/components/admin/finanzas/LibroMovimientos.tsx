"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Pastilla, { TONO_ESTADO } from "@/components/admin/Pastilla";
import Paginacion from "@/components/admin/usuarios/Paginacion";
import {
  csvMovimientos,
  descargarCsv,
} from "@/components/admin/usuarios/exportar";
import { useToast } from "@/context/ToastContext";
import { fecha, moneda, numero } from "@/lib/admin/format";
import type { MetodoPago, Movimiento } from "@/lib/admin/types";
import { normalizar } from "@/lib/validacion";

const POR_PAGINA = 15;

type Tipo = "todos" | "cobro" | "gasto";

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

const TIPOS: { valor: Tipo; texto: string }[] = [
  { valor: "todos", texto: "Todos" },
  { valor: "cobro", texto: "Cobros" },
  { valor: "gasto", texto: "Gastos" },
];

/** Columnas de escritorio, en un solo sitio para cabecera y filas: son dos
 *  rejillas independientes, así que ninguna columna puede ser `auto`. */
const REJILLA = "md:grid-cols-[5.5rem_6.5rem_1fr_8rem_9rem]";

/** Lo que se busca de cada movimiento: quién o qué, y su plan o categoría. */
function textoDe(m: Movimiento): string {
  return m.tipo === "cobro"
    ? `${m.cliente} ${m.plan ?? ""}`
    : `${m.concepto} ${m.categoria}`;
}

/**
 * Libro de movimientos: cobros y gastos juntos, del periodo elegido arriba.
 *
 * ⚠️ **Antes solo enseñaba cobros**, y un gasto registrado no aparecía en
 * ninguna parte. Un libro que enseña lo que entra y no lo que sale no sirve
 * para cuadrar la caja, que es para lo que se abre.
 *
 * Filtra en el cliente sobre lo que ya llegó, sin `debounce` (no hay petición
 * que ahorrar), igual que el listado de Usuarios.
 *
 * ⚠️ La línea de totales se recalcula CON los filtros. Y distingue los dos
 * vacíos (idea de JainSportBox): «no hubo movimientos» no es lo mismo que «tu
 * filtro no deja ver ninguno», y confundirlos hace creer que el mes está vacío
 * cuando lo que hay es un filtro olvidado.
 *
 * Los cobros enlazan a la ficha del cliente; los gastos no, porque no tienen
 * ficha. Por eso la fila no es siempre un `<Link>`.
 */
export default function LibroMovimientos({
  movimientos,
  etiqueta,
  hoy,
}: {
  /** Ya recortados al periodo. */
  movimientos: Movimiento[];
  etiqueta: string;
  hoy: string;
}) {
  const { mostrarAviso } = useToast();
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState<Tipo>("todos");
  const [metodo, setMetodo] = useState<MetodoPago | "Todos">("Todos");
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
    return movimientos.filter((m) => {
      if (tipo !== "todos" && m.tipo !== tipo) return false;
      if (metodo !== "Todos" && m.metodo !== metodo) return false;
      if (q && !normalizar(textoDe(m)).includes(q)) return false;
      return true;
    });
  }, [movimientos, busqueda, tipo, metodo]);

  const entra = filtrados
    .filter((m) => m.tipo === "cobro")
    .reduce((t, m) => t + m.importe, 0);
  const sale = filtrados
    .filter((m) => m.tipo === "gasto")
    .reduce((t, m) => t + m.importe, 0);

  const total = filtrados.length;
  // Acotada al vuelo y no con un efecto: así no hay un render intermedio
  // pintando una página que ya no existe (al cambiar de periodo, por ejemplo).
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;

  const hayFiltros = busqueda !== "" || tipo !== "todos" || metodo !== "Todos";

  function limpiar() {
    setBusqueda("");
    setTipo("todos");
    setMetodo("Todos");
    setPagina(1);
  }

  function exportar() {
    descargarCsv(`movimientos-${hoy}.csv`, csvMovimientos(filtrados));
    mostrarAviso(
      `Se descargaron ${numero(total)} ${total === 1 ? "movimiento" : "movimientos"} de ${etiqueta}.`,
      "success",
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-b border-beige px-5 py-4 sm:px-6">
        <label className="min-w-[12rem] flex-1">
          <span className="sr-only">Buscar por cliente, concepto o plan</span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => filtrar(setBusqueda)(e.target.value)}
            placeholder="Buscar cliente, concepto o plan…"
            className="min-h-[44px] w-full rounded-full border border-beige bg-white px-5 text-sm text-verde-700 placeholder:text-verde-300 transition-colors duration-300 hover:border-dorado/60"
          />
        </label>

        <div
          role="group"
          aria-label="Tipo de movimiento"
          className="flex rounded-full border border-beige bg-white p-1"
        >
          {TIPOS.map((t) => (
            <button
              key={t.valor}
              type="button"
              aria-pressed={tipo === t.valor}
              onClick={() => filtrar(setTipo)(t.valor)}
              className={`min-h-[36px] rounded-full px-4 text-sm transition-colors duration-300 ${
                tipo === t.valor
                  ? "bg-dorado text-verde-900"
                  : "text-verde-700 hover:text-verde"
              }`}
            >
              {t.texto}
            </button>
          ))}
        </div>

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

        <button
          type="button"
          onClick={exportar}
          disabled={total === 0}
          className={`${BOTON} disabled:pointer-events-none disabled:opacity-50`}
        >
          <span className="control-sheen" aria-hidden="true" />
          <span aria-hidden="true">↓</span>
          Exportar
        </button>
      </div>

      {/* Los totales de lo filtrado, junto a los filtros que lo producen: es
          la cifra por la que se abre un libro. Entra y sale por separado, y no
          solo el neto: un neto de $0 puede ser «no pasó nada» o «entró lo
          mismo que salió». */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-beige bg-arena/40 px-5 py-3 sm:px-6">
        <p className="text-sm text-verde-300">
          {numero(total)} {total === 1 ? "movimiento" : "movimientos"}
          {hayFiltros && " coinciden con el filtro"}
        </p>
        <p className="font-cifra flex flex-wrap gap-x-4 font-normal text-verde-700">
          {tipo !== "gasto" && <span>Entra {moneda(entra)}</span>}
          {tipo !== "cobro" && <span>Sale {moneda(sale)}</span>}
        </p>
      </div>

      {total === 0 ? (
        <div className="px-5 py-12 text-center sm:px-6">
          {hayFiltros ? (
            <>
              <p className="text-verde-300">
                Ningún movimiento de {etiqueta} coincide con el filtro.
              </p>
              <button type="button" onClick={limpiar} className={`${BOTON} mt-4`}>
                <span className="control-sheen" aria-hidden="true" />
                Quitar filtros
              </button>
            </>
          ) : (
            <p className="text-verde-300">
              No hubo movimientos en {etiqueta}.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Cabecera solo en escritorio y `aria-hidden`: esto no es una
              <table> —una fila puede ser un enlace—, así que un lector no
              relacionaría rótulo y celda. Cada fila lleva sus `sr-only`.
              Mismo patrón que `CabeceraLista` en Usuarios. */}
          <div
            aria-hidden="true"
            className={`hidden gap-4 border-b border-beige px-6 py-2 text-xs uppercase tracking-[0.14em] text-verde-300 md:grid ${REJILLA}`}
          >
            <span>Fecha</span>
            <span>Tipo</span>
            <span>Concepto</span>
            <span>Método</span>
            <span className="text-right">Importe</span>
          </div>

          <ul className="divide-y divide-beige">
            {filtrados.slice(inicio, inicio + POR_PAGINA).map((m) => (
              <li key={`${m.tipo}-${m.id}`}>
                <Fila m={m} />
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

function Fila({ m }: { m: Movimiento }) {
  const cobro = m.tipo === "cobro";
  const clase = `grid min-h-[56px] grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3 sm:px-6 ${REJILLA}`;

  const contenido = (
    <>
      <span className="order-3 text-xs tabular-nums text-verde-300 md:order-none md:text-sm">
        {fecha(m.fecha)}
      </span>

      <span className="order-4 md:order-none">
        {/* Símbolo + texto, nunca solo color: ● cobro, ■ gasto. */}
        <Pastilla
          simbolo={cobro ? "●" : "■"}
          texto={cobro ? "Cobro" : "Gasto"}
          clase={cobro ? TONO_ESTADO.ok : TONO_ESTADO.neutro}
        />
      </span>

      <span className="order-1 min-w-0 md:order-none">
        <span className="block truncate text-verde">
          {cobro ? m.cliente : m.concepto}
        </span>
        <span className="block truncate text-xs text-verde-300">
          {cobro ? (m.plan ?? "Sin plan") : m.categoria}
        </span>
      </span>

      <span className="order-5 truncate text-xs text-verde-300 md:order-none md:text-sm">
        <span className="md:sr-only">Método: </span>
        {m.metodo}
      </span>

      {/* El signo va escrito: el color de la cifra acompaña, no informa. */}
      <span
        className={`font-cifra order-2 shrink-0 font-normal md:order-none md:text-right ${
          cobro ? "text-[var(--color-estado-ok)]" : "text-verde-700"
        }`}
      >
        {cobro ? "+" : "−"}
        {moneda(m.importe)}
      </span>
    </>
  );

  return cobro ? (
    <Link
      href={`/admin/usuarios/${m.clienteId}`}
      className={`${clase} transition-colors duration-200 hover:bg-arena/70`}
    >
      {contenido}
    </Link>
  ) : (
    <div className={clase}>{contenido}</div>
  );
}
