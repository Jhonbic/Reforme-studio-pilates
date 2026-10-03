"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  csvMovimientos,
  descargarCsv,
} from "@/components/admin/usuarios/exportar";
import { useToast } from "@/context/ToastContext";
import { urlComprobante } from "@/lib/admin/acciones";
import { CATEGORIAS_GASTO, METODOS_PAGO } from "@/lib/admin/catalogos";
import { fecha, moneda, numero } from "@/lib/admin/format";
import type { MetodoPago, Movimiento } from "@/lib/admin/types";
import { normalizar } from "@/lib/validacion";

const POR_PAGINA = 15;

type Tipo = "cobro" | "gasto" | null;

/** Los cobros de Reforme son siempre de una membresía; los gastos, de su
 *  categoría. Es lo que en Jain es «categoría» de cada movimiento. */
const MEMBRESIA = "Membresía";
const categoriaDe = (m: Movimiento) => (m.tipo === "cobro" ? MEMBRESIA : m.categoria);

/* Clases de JainSportBox con los colores de Reforme. */
const SELECT =
  "rounded-lg border border-beige bg-white px-3 py-2 text-xs font-semibold text-verde-700 outline-none focus:ring-2 focus:ring-dorado/50";
const GRUPO = "flex flex-wrap items-center gap-1 rounded-lg bg-arena p-1";
const OPCION = "rounded-md px-3 py-1 text-xs font-semibold transition-colors";
const OPCION_OFF = "text-verde-300 hover:text-verde-700";

/** Números a mostrar, con elipsis: 1 … 4 [5] 6 … 12 (igual que Jain). */
function paginasVisibles(total: number, act: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const paginas: (number | "…")[] = [1];
  if (act > 3) paginas.push("…");
  for (let p = Math.max(2, act - 1); p <= Math.min(total - 1, act + 1); p++) paginas.push(p);
  if (act < total - 2) paginas.push("…");
  paginas.push(total);
  return paginas;
}

/**
 * «Historial de movimientos»: copia del de JainSportBox
 * (`FinanzasView.vue`, bloque «Historial») con los colores de Reforme.
 * Decisión del usuario (oct 2026).
 *
 * Mismos filtros que Jain: buscador (concepto o cliente), tipo
 * (Todos · Ingresos · Egresos), categoría, plan (solo cuando puede haber
 * cobros), método de pago y «Limpiar». Con filtros puestos, una línea dice
 * cuántos coinciden y cuánto suman; sin ella habría que sumar a mano.
 *
 * Diferencias que son de datos: Reforme tiene cuatro métodos de pago (Jain,
 * dos), sus cobros son siempre de membresía, y los gastos pueden traer
 * comprobante. No hay botón de borrar: los cobros no se borran por diseño y
 * borrar gastos está pendiente.
 *
 * Filtra en el cliente sobre lo que ya llegó, sin `debounce`: no hay petición
 * que ahorrar (en Jain el filtro va al servidor).
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
  const [tipo, setTipo] = useState<Tipo>(null);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [metodo, setMetodo] = useState<MetodoPago | null>(null);
  const [pagina, setPagina] = useState(1);

  /* Cualquier filtro nuevo invalida la página actual: la 3 de un listado de
     40 no existe en uno de 5. */
  function filtrar<T>(set: (v: T) => void) {
    return (v: T) => {
      set(v);
      setPagina(1);
    };
  }

  // El plan solo acota cobros: en Egresos o en una categoría de gasto no
  // significa nada, y dejarlo puesto vaciaría la tabla sin que se vea por qué.
  const puedeFiltrarPlan = tipo !== "gasto" && (categoria === null || categoria === MEMBRESIA);
  const planActivo = puedeFiltrarPlan ? plan : null;

  const categorias =
    tipo === "cobro" ? [MEMBRESIA] : tipo === "gasto" ? CATEGORIAS_GASTO : [MEMBRESIA, ...CATEGORIAS_GASTO];
  // Una categoría que el nuevo tipo no ofrece se ignora (como el plan).
  const categoriaActiva = categoria && (categorias as string[]).includes(categoria) ? categoria : null;

  const planes = useMemo(
    () =>
      [...new Set(movimientos.flatMap((m) => (m.tipo === "cobro" && m.plan ? [m.plan] : [])))].sort(
        (a, b) => a.localeCompare(b, "es"),
      ),
    [movimientos],
  );

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return movimientos.filter((m) => {
      if (tipo && m.tipo !== tipo) return false;
      if (categoriaActiva && categoriaDe(m) !== categoriaActiva) return false;
      if (planActivo && (m.tipo !== "cobro" || m.plan !== planActivo)) return false;
      if (metodo && m.metodo !== metodo) return false;
      if (q) {
        const texto = m.tipo === "cobro" ? `${m.cliente} ${m.plan ?? ""}` : m.concepto;
        if (!normalizar(texto).includes(q)) return false;
      }
      return true;
    });
  }, [movimientos, busqueda, tipo, categoriaActiva, planActivo, metodo]);

  const hayFiltros = Boolean(tipo || categoriaActiva || planActivo || metodo || busqueda.trim());
  // Neto de lo filtrado: con ingresos y egresos mezclados, «suman» es lo que queda.
  const suma = filtrados.reduce((t, m) => t + (m.tipo === "cobro" ? m.importe : -m.importe), 0);

  const total = filtrados.length;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  // Acotada al vuelo y no con un efecto: al cambiar de periodo la página 5
  // puede dejar de existir, y no debe pintarse vacía ni un instante.
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const filaHasta = Math.min(inicio + POR_PAGINA, total);

  function limpiar() {
    setBusqueda("");
    setTipo(null);
    setCategoria(null);
    setPlan(null);
    setMetodo(null);
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
    <div className="overflow-hidden rounded-2xl border border-beige bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-beige px-6 py-4">
        <h3 className="font-bold text-verde">Historial de movimientos</h3>
        <div className="flex flex-wrap items-center gap-2">
          {/* Buscador: concepto y nombre del cliente. */}
          <div className="relative w-full sm:w-auto">
            <svg
              className="absolute left-3 top-2.5 h-4 w-4 text-verde-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => filtrar(setBusqueda)(e.target.value)}
              placeholder="Buscar concepto o cliente..."
              aria-label="Buscar concepto o cliente"
              className="w-full rounded-lg border border-beige py-2 pl-9 pr-3 sm:w-56 text-sm text-verde outline-none placeholder:text-verde-300 focus:ring-2 focus:ring-dorado/50"
            />
          </div>

          {/* Filtro tipo */}
          <div role="group" aria-label="Tipo de movimiento" className={GRUPO}>
            {(
              [
                [null, "Todos", "text-verde"],
                ["cobro", "Ingresos", "text-[var(--color-estado-ok)]"],
                ["gasto", "Egresos", "text-[var(--color-estado-grave)]"],
              ] as const
            ).map(([valor, texto, color]) => (
              <button
                key={texto}
                type="button"
                aria-pressed={tipo === valor}
                onClick={() => filtrar(setTipo)(valor)}
                className={`${OPCION} ${tipo === valor ? `bg-white shadow ${color}` : OPCION_OFF}`}
              >
                {texto}
              </button>
            ))}
          </div>

          {/* Filtro categoría */}
          <select
            value={categoriaActiva ?? ""}
            onChange={(e) => filtrar(setCategoria)(e.target.value || null)}
            aria-label="Categoría"
            className={SELECT}
          >
            <option value="">Toda categoría</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Filtro plan: solo aplica a cobros de membresía */}
          {puedeFiltrarPlan && planes.length > 0 && (
            <select
              value={planActivo ?? ""}
              onChange={(e) => filtrar(setPlan)(e.target.value || null)}
              aria-label="Plan"
              className={SELECT}
            >
              <option value="">Todo plan</option>
              {planes.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}

          {/* Filtro método de pago */}
          <div role="group" aria-label="Método de pago" className={GRUPO}>
            <button
              type="button"
              aria-pressed={metodo === null}
              onClick={() => filtrar(setMetodo)(null)}
              className={`${OPCION} ${metodo === null ? "bg-white text-verde shadow" : OPCION_OFF}`}
            >
              Todos
            </button>
            {METODOS_PAGO.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={metodo === m}
                onClick={() => filtrar(setMetodo)(m)}
                className={`${OPCION} ${metodo === m ? "bg-white text-dorado-dark shadow" : OPCION_OFF}`}
              >
                {m}
              </button>
            ))}
          </div>

          {hayFiltros && (
            <button
              type="button"
              onClick={limpiar}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-verde-300 transition-colors hover:bg-dorado/10 hover:text-dorado-dark"
            >
              Limpiar
            </button>
          )}

          {/* Exporta lo que el historial tiene filtrado, con el importe con
              signo para que =SUMA() dé el neto. */}
          <button
            type="button"
            onClick={exportar}
            disabled={total === 0}
            className="rounded-lg border border-beige px-3 py-2 text-xs font-semibold text-verde-700 transition-colors hover:border-dorado disabled:pointer-events-none disabled:opacity-40"
          >
            Exportar
          </button>
        </div>
      </div>

      {/* Con filtros puestos, las cifras de arriba son del periodo completo y
          no de lo filtrado: sin esta línea habría que sumar a mano. */}
      {hayFiltros && total > 0 && (
        <div className="border-b border-beige bg-arena/60 px-6 py-2.5 text-xs text-verde-300">
          <span className="font-bold text-verde-700">{numero(total)}</span>{" "}
          {total === 1 ? "movimiento coincide" : "movimientos coinciden"} · suman{" "}
          <span className="font-bold text-verde-700">
            {suma < 0 ? "−" : ""}
            {moneda(Math.abs(suma))}
          </span>
        </div>
      )}

      {total === 0 ? (
        <div className="p-12 text-center text-verde-300">
          <svg className="mx-auto mb-3 h-12 w-12 text-beige" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {/* «No hay nada» no es «no hay nada que coincida»: confundirlos hace
              creer que el periodo está vacío cuando hay un filtro olvidado. */}
          {hayFiltros ? (
            <>
              Ningún movimiento coincide con el filtro.
              <button
                type="button"
                onClick={limpiar}
                className="mx-auto mt-3 block text-sm font-semibold text-dorado-dark hover:underline"
              >
                Limpiar filtros
              </button>
            </>
          ) : (
            "Sin movimientos en este período."
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-beige">
            <thead className="bg-arena/60">
              <tr>
                {["Fecha", "Tipo", "Concepto", "Categoría", "Método"].map((c) => (
                  <th
                    key={c}
                    scope="col"
                    className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-verde-300"
                  >
                    {c}
                  </th>
                ))}
                <th scope="col" className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-verde-300">
                  Monto
                </th>
                <th scope="col" className="px-5 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-beige/60">
              {filtrados.slice(inicio, filaHasta).map((m) => {
                const ingreso = m.tipo === "cobro";
                return (
                  <tr key={`${m.tipo}-${m.id}`} className="transition-colors hover:bg-arena/60">
                    <td className="whitespace-nowrap px-5 py-3.5 text-sm text-verde-300">{fecha(m.fecha)}</td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                          ingreso
                            ? "bg-[color-mix(in_srgb,var(--color-estado-ok)_12%,transparent)] text-[var(--color-estado-ok)]"
                            : "bg-[color-mix(in_srgb,var(--color-estado-grave)_12%,transparent)] text-[var(--color-estado-grave)]"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            ingreso ? "bg-[var(--color-estado-ok)]" : "bg-[var(--color-estado-grave)]"
                          }`}
                          aria-hidden="true"
                        />
                        {ingreso ? "Ingreso" : "Egreso"}
                      </span>
                    </td>
                    <td className="max-w-[260px] px-5 py-3.5 text-sm text-verde">
                      <p className="truncate font-medium">
                        {ingreso ? `Membresía ${m.plan ?? ""}`.trim() : m.concepto}
                      </p>
                      {ingreso && (
                        <Link
                          href={`/admin/usuarios/${m.clienteId}`}
                          className="block truncate text-xs text-verde-300 hover:text-dorado-dark hover:underline"
                        >
                          {m.cliente}
                        </Link>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      {/* Neutro: el signo del movimiento ya se lee en el color
                          del monto, y seis colores de categoría estorban. */}
                      <span className="rounded-full bg-arena px-2.5 py-1 text-xs font-medium text-verde-700">
                        {categoriaDe(m)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-sm text-verde-300">{m.metodo}</td>
                    <td
                      className={`whitespace-nowrap px-5 py-3.5 text-right font-cifra text-sm font-bold ${
                        ingreso ? "text-[var(--color-estado-ok)]" : "text-[var(--color-estado-grave)]"
                      }`}
                    >
                      {ingreso ? "+" : "−"}
                      {moneda(m.importe)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right text-xs">
                      {!ingreso && m.comprobante && <VerComprobante gastoId={m.id} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Paginación ── */}
      {total > POR_PAGINA && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-beige px-5 py-4 sm:flex-row">
          <p className="order-2 text-xs text-verde-300 sm:order-1">
            Mostrando{" "}
            <span className="font-bold text-verde-700">
              {inicio + 1}–{filaHasta}
            </span>{" "}
            de <span className="font-bold text-verde-700">{numero(total)}</span>
          </p>
          <div className="order-1 flex items-center gap-1 sm:order-2">
            <button
              type="button"
              onClick={() => setPagina(paginaActual - 1)}
              disabled={paginaActual === 1}
              aria-label="Página anterior"
              className="rounded-lg border border-beige px-2.5 py-1.5 text-verde-300 transition-colors hover:border-dorado hover:text-verde disabled:pointer-events-none disabled:opacity-40"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {paginasVisibles(totalPaginas, paginaActual).map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="select-none px-1.5 text-sm text-verde-300">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPagina(p)}
                  aria-current={p === paginaActual ? "page" : undefined}
                  className={`min-w-[2rem] rounded-lg border px-2 py-1.5 text-sm font-bold transition-colors ${
                    p === paginaActual
                      ? "border-verde bg-verde text-arena"
                      : "border-beige bg-white text-verde-300 hover:border-dorado hover:text-verde"
                  }`}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => setPagina(paginaActual + 1)}
              disabled={paginaActual === totalPaginas}
              aria-label="Página siguiente"
              className="rounded-lg border border-beige px-2.5 py-1.5 text-verde-300 transition-colors hover:border-dorado hover:text-verde disabled:pointer-events-none disabled:opacity-40"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Abre la factura de un gasto en otra pestaña.
 *
 * ⚠️ La pestaña se abre ANTES de pedir el enlace y luego se le da la
 * dirección. Abrirla después del `await` la bloquearía el navegador: un
 * `window.open` que no sale directamente de un clic se trata como ventana
 * emergente. El enlace dura 60 s: el bucket es privado.
 */
function VerComprobante({ gastoId }: { gastoId: string }) {
  const { mostrarAviso } = useToast();
  async function abrir() {
    const pestana = window.open("", "_blank");
    const url = await urlComprobante(gastoId);
    if (url && pestana) {
      pestana.location.href = url;
    } else {
      pestana?.close();
      mostrarAviso("No se pudo abrir el comprobante.", "warning");
    }
  }
  return (
    <button type="button" onClick={abrir} className="font-semibold text-dorado-dark hover:underline">
      Comprobante
    </button>
  );
}
