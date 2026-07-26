"use client";

import type { EstadoMembresia, TipoPlan } from "@/lib/admin/types";
import { numero } from "@/lib/admin/format";

export type FiltroEstado = EstadoMembresia | "Todas";
export type FiltroPlan = TipoPlan | "Todos";
export type Orden = "nombre" | "vencimiento" | "alta" | "importe";

const ESTADOS: FiltroEstado[] = [
  "Todas",
  "Activa",
  "Por vencer",
  "Vencida",
  "Inactiva",
];

const PLANES: FiltroPlan[] = [
  "Todos",
  "Mensual",
  "Trimestral",
  "Pack 10 clases",
  "Clase suelta",
];

const ORDENES: { valor: Orden; etiqueta: string }[] = [
  { valor: "nombre", etiqueta: "Nombre (A–Z)" },
  { valor: "vencimiento", etiqueta: "Vence antes" },
  { valor: "alta", etiqueta: "Alta más reciente" },
  { valor: "importe", etiqueta: "Mayor importe" },
];

/* ⚠️ Los `<select>` son los únicos controles SIN el dash diagonal: un `<select>`
   nativo solo admite `<option>` como hijos, así que no hay dónde colgar el
   `<span>` del barrido. Se quedan con el borde dorado al pasar por encima. La
   alternativa sería un desplegable propio, y se descartó a propósito: el nativo
   abre el selector del sistema en móvil y trae teclado y accesibilidad gratis. */
const SELECT =
  "min-h-[44px] rounded-full border border-beige bg-white px-4 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado/60";

type Props = {
  busqueda: string;
  onBusqueda: (v: string) => void;
  /** Los filtros de membresía solo tienen sentido en la pestaña de clientes. */
  mostrarFiltros: boolean;
  estado: FiltroEstado;
  onEstado: (v: FiltroEstado) => void;
  conteos: Record<FiltroEstado, number>;
  plan: FiltroPlan;
  onPlan: (v: FiltroPlan) => void;
  orden: Orden;
  onOrden: (v: Orden) => void;
  etiquetaBusqueda: string;
};

/**
 * Buscador + filtros del listado.
 *
 * **Los recuentos viven dentro de las propias pastillas de estado**, no en una
 * fila de cifras aparte: el dato y el control por el que se filtra son la misma
 * cosa, y así el número no se repite en dos sitios de la pantalla.
 */
export default function BarraFiltros({
  busqueda,
  onBusqueda,
  mostrarFiltros,
  estado,
  onEstado,
  conteos,
  plan,
  onPlan,
  orden,
  onOrden,
  etiquetaBusqueda,
}: Props) {
  return (
    <div className="space-y-4 border-b border-beige px-4 py-4 sm:px-5">
      <div className="relative">
        <label htmlFor="buscar-usuarios" className="sr-only">
          {etiquetaBusqueda}
        </label>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-verde-300"
        >
          ⌕
        </span>
        <input
          id="buscar-usuarios"
          type="search"
          value={busqueda}
          onChange={(e) => onBusqueda(e.target.value)}
          placeholder={etiquetaBusqueda}
          className="min-h-[44px] w-full rounded-full border border-beige bg-white pl-10 pr-4 text-sm text-verde transition-colors duration-300 placeholder:text-verde-300 hover:border-dorado/50 focus:border-dorado focus:outline-none"
        />
      </div>

      {mostrarFiltros && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Scroll horizontal en móvil, como las pastillas de `AdminNav`: son
              cinco y no caben en 375px. Los márgenes negativos dejan que el
              raíl llegue al borde de la tarjeta en vez de cortarse antes. */}
          <div
            role="group"
            aria-label="Filtrar por estado de membresía"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-5 sm:px-5 lg:mx-0 lg:flex-wrap lg:px-0 [&::-webkit-scrollbar]:hidden"
          >
            {ESTADOS.map((e) => {
              const activo = e === estado;
              return (
                <button
                  key={e}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => onEstado(e)}
                  className={`control-fx relative flex min-h-[44px] shrink-0 items-center gap-2 overflow-hidden rounded-full px-4 text-sm transition-colors duration-300 ${
                    activo
                      ? "bg-dorado text-verde-900"
                      : "border border-beige text-verde-700 hover:border-dorado/60 hover:text-verde"
                  }`}
                >
                  {!activo && (
                    <span className="control-sheen" aria-hidden="true" />
                  )}
                  {e}
                  {/* ⚠️ En la activa el recuento va en `verde-900` **sólido**, no
                      atenuado: es el par documentado sobre dorado (5,47:1). Con
                      `verde-900/70` la mezcla cae a ~3,3:1 y no llega al 4,5 de
                      AA para texto pequeño. La jerarquía la marca el tamaño. */}
                  <span
                    className={`tabular-nums ${activo ? "text-verde-900" : "text-verde-300"}`}
                  >
                    {numero(conteos[e])}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="filtro-plan">
              Filtrar por plan
            </label>
            <select
              id="filtro-plan"
              value={plan}
              onChange={(e) => onPlan(e.target.value as FiltroPlan)}
              className={SELECT}
            >
              {PLANES.map((p) => (
                <option key={p} value={p}>
                  {p === "Todos" ? "Todos los planes" : p}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="filtro-orden">
              Ordenar por
            </label>
            <select
              id="filtro-orden"
              value={orden}
              onChange={(e) => onOrden(e.target.value as Orden)}
              className={SELECT}
            >
              {ORDENES.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
