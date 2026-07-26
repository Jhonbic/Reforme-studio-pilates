"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import Card from "@/components/admin/Card";
import BarraFiltros, {
  type FiltroEstado,
  type FiltroPlan,
  type Orden,
} from "./BarraFiltros";
import CabeceraLista from "./CabeceraLista";
import EstadoVacio from "./EstadoVacio";
import MenuExportar from "./MenuExportar";
import { csvClientes, csvEquipo, descargarCsv } from "./exportar";
import FilaCliente from "./FilaCliente";
import FilaMiembro from "./FilaMiembro";
import Paginacion from "./Paginacion";
import type { Cliente, MiembroEquipo } from "@/lib/admin/types";
import { normalizar, soloDigitos } from "@/lib/validacion";
import { useToast } from "@/context/ToastContext";

const POR_PAGINA = 12;

/** Las dos acciones de la cabecera comparten forma: son del mismo rango. */
const BOTON_CABECERA =
  "control-fx relative inline-flex min-h-[44px] items-center gap-2 overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde";

const PESTANAS = [
  { id: "clientes", etiqueta: "Clientes" },
  { id: "equipo", etiqueta: "Equipo" },
] as const;

type Pestana = (typeof PESTANAS)[number]["id"];

/* `normalizar` (sin tildes) y `soloDigitos` vivían aquí. Se mudaron a
   `@/lib/validacion` al nacer el formulario de alta, que necesita las mismas
   dos: quien escribe «Gutierrez» espera a «Gutiérrez», y «1.045», «1045» y
   «1 045» tienen que ser la misma búsqueda. */

type Props = {
  clientes: Cliente[];
  equipo: MiembroEquipo[];
  conteos: Record<FiltroEstado, number>;
};

/**
 * Listado de personas del estudio: clientes y equipo.
 *
 * Todo el filtrado ocurre **en el cliente**, sobre un array ya cargado — no hay
 * backend al que pedir páginas. Por eso la búsqueda no lleva `debounce`: no hay
 * ninguna petición que ahorrar.
 *
 * ⚠️ **La pestaña y los filtros son estado, no ruta.** Podrían vivir en la URL,
 * pero leer `searchParams` en la página la volvería dinámica y el panel entero
 * dejaría de compilar como `○ Static`. El precio es que un filtro concreto no
 * se puede compartir por enlace; cuando haya backend y paginación de servidor,
 * ese es el momento de subirlos a la URL.
 */
export default function PanelUsuarios({ clientes, equipo, conteos }: Props) {
  const [pestana, setPestana] = useState<Pestana>("clientes");
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<FiltroEstado>("Todas");
  const [plan, setPlan] = useState<FiltroPlan>("Todos");
  const [orden, setOrden] = useState<Orden>("nombre");
  const [pagina, setPagina] = useState(1);
  /* Los avisos de las acciones de cabecera eran un `<p role="status">` fijo bajo
     las pestañas. Se van al sistema de avisos flotantes por dos motivos: el
     texto se quedaba ahí para siempre —una hora después seguía diciendo «se
     descargaron 118 clientes»— y ocupaba una línea de alto permanente aunque
     estuviera vacío. La región `aria-live` sigue siendo una sola, ahora en el
     contenedor de la pila. */
  const { mostrarAviso } = useToast();
  const refsPestanas = useRef<(HTMLButtonElement | null)[]>([]);

  const esClientes = pestana === "clientes";

  /* Cualquier cambio de filtro devuelve a la página 1: si estabas en la 7 y al
     filtrar solo quedan 2, la lista se vería vacía sin explicación. */
  function filtrar<T>(set: (v: T) => void) {
    return (v: T) => {
      set(v);
      setPagina(1);
    };
  }

  function limpiar() {
    setBusqueda("");
    setEstado("Todas");
    setPlan("Todos");
    setPagina(1);
  }

  const listaClientes = useMemo(() => {
    const q = normalizar(busqueda.trim());
    /* Si lo escrito tiene dígitos se busca además por cédula. No es un modo
       aparte que haya que elegir: teclear «1045» busca documento, teclear
       «laura» busca nombre, y no hay ningún selector que mantener. */
    const digitos = soloDigitos(busqueda);
    const filtrados = clientes.filter((c) => {
      if (estado !== "Todas" && c.estado !== estado) return false;
      if (plan !== "Todos" && c.plan !== plan) return false;
      if (!q) return true;
      if (digitos && c.identificacion.includes(digitos)) return true;
      return normalizar(c.nombre).includes(q);
    });

    const ordenados = [...filtrados];
    if (orden === "nombre") {
      ordenados.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    } else if (orden === "vencimiento") {
      // Las fechas van en ISO corto justamente para poder ordenarlas como texto.
      ordenados.sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));
    } else if (orden === "alta") {
      ordenados.sort((a, b) => b.alta.localeCompare(a.alta));
    } else {
      ordenados.sort((a, b) => b.importeRenovacion - a.importeRenovacion);
    }
    return ordenados;
  }, [clientes, busqueda, estado, plan, orden]);

  const listaEquipo = useMemo(() => {
    const q = normalizar(busqueda.trim());
    if (!q) return equipo;
    return equipo.filter(
      (m) =>
        normalizar(m.nombre).includes(q) ||
        normalizar(m.correo).includes(q) ||
        normalizar(m.rol).includes(q),
    );
  }, [equipo, busqueda]);

  const total = esClientes ? listaClientes.length : listaEquipo.length;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  /* La página se acota al vuelo en vez de corregirse en un efecto: así nunca
     hay un render intermedio pintando una página que ya no existe. */
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;

  /**
   * Descarga los listados marcados en el menú.
   *
   * ⚠️ Exporta **la lista filtrada completa, no la página visible**: si filtras
   * «Por vencer» y descargas, esperas los 7, no los 7 de la página 1. Y por eso
   * mismo exporta el filtro y no la base entera — si no, los filtros no
   * servirían para nada a la hora de sacar los datos.
   *
   * ⚠️ **No depende de la pestaña activa.** Se puede estar mirando el Equipo y
   * descargar Clientes: son dos listados independientes, no dos vistas de lo
   * mismo.
   */
  function exportar({
    clientes: conClientes,
    equipo: conEquipo,
  }: {
    clientes: boolean;
    equipo: boolean;
  }) {
    const sello = new Date().toISOString().slice(0, 10);
    const hechos: string[] = [];

    if (conClientes) {
      descargarCsv(`clientes-${sello}.csv`, csvClientes(listaClientes));
      hechos.push(`${listaClientes.length} clientes`);
    }
    if (conEquipo) {
      descargarCsv(`equipo-${sello}.csv`, csvEquipo(listaEquipo));
      hechos.push(`${listaEquipo.length} miembros del equipo`);
    }

    mostrarAviso(`Se descargaron ${hechos.join(" y ")}.`, "success");
  }

  function irAPestana(i: number) {
    const destino = PESTANAS[(i + PESTANAS.length) % PESTANAS.length];
    setPestana(destino.id);
    setPagina(1);
    refsPestanas.current[PESTANAS.indexOf(destino)]?.focus();
  }

  return (
    <div className="space-y-4">
      {/* Pestañas fuera de la tarjeta: así la tarjeta es el panel de la pestaña
          activa y no hay que dibujar ninguna separación extra entre ambas. El
          alta va en el extremo opuesto de esta misma fila — es la única acción
          de la pantalla, y en la esquina no compite con los filtros. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
      <div
        role="tablist"
        aria-label="Personas del estudio"
        className="flex gap-2"
      >
        {PESTANAS.map((p, i) => {
          const activa = p.id === pestana;
          return (
            <button
              key={p.id}
              ref={(el) => {
                refsPestanas.current[i] = el;
              }}
              role="tab"
              type="button"
              id={`pestana-${p.id}`}
              aria-selected={activa}
              aria-controls="panel-lista"
              tabIndex={activa ? 0 : -1}
              onClick={() => {
                setPestana(p.id);
                setPagina(1);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") irAPestana(i + 1);
                if (e.key === "ArrowLeft") irAPestana(i - 1);
              }}
              className={`control-fx relative min-h-[44px] overflow-hidden rounded-full px-5 font-display text-lg transition-colors duration-300 ${
                activa
                  ? "bg-dorado text-verde-900"
                  : "text-verde-300 hover:text-verde"
              }`}
            >
              {/* Solo en la inactiva: sobre el dorado de la activa un dorado al
                  28 % no se ve, y la pestaña activa ya está señalada por su
                  relleno — no necesita respuesta al hover. */}
              {!activa && (
                <span className="control-sheen" aria-hidden="true" />
              )}
              {p.etiqueta}
            </button>
          );
        })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Exportar **sí funciona**: los datos ya están en el navegador y el
              CSV se genera aquí, así que no depende de que haya backend. Es la
              única acción real de la pantalla. */}
          <MenuExportar
            totalClientes={listaClientes.length}
            totalEquipo={listaEquipo.length}
            onExportar={exportar}
            className={BOTON_CABECERA}
          />

          {/* ⚠️ Solo los CLIENTES tienen pantalla de alta. El alta de equipo
              sigue sin existir, así que ahí se queda el botón inerte con su
              `aria-disabled` (y no `disabled`, que no recibe foco: nadie
              llegaría a leer el porqué). */}
          {esClientes ? (
            <Link href="/admin/usuarios/nuevo" className={BOTON_CABECERA}>
              <span className="control-sheen" aria-hidden="true" />
              <span aria-hidden="true">+</span>
              Nuevo cliente
            </Link>
          ) : (
            <button
              type="button"
              aria-disabled="true"
              onClick={() =>
                mostrarAviso(
                  "El alta de equipo llegará cuando haya base de datos.",
                  "info",
                )
              }
              className={BOTON_CABECERA}
            >
              <span className="control-sheen" aria-hidden="true" />
              <span aria-hidden="true">+</span>
              Nuevo miembro
            </button>
          )}
        </div>
      </div>

      {/* El `tabpanel` va en un `<div>` propio y no en la `Card`: las props de
          `Card` son cerradas a propósito (tono, densidad, fx, sheen…) y abrirla
          a atributos ARIA arbitrarios por un solo uso no compensa. */}
      <div
        role="tabpanel"
        id="panel-lista"
        aria-labelledby={`pestana-${pestana}`}
      >
      <Card densidad="plana">
        <BarraFiltros
          busqueda={busqueda}
          onBusqueda={filtrar(setBusqueda)}
          mostrarFiltros={esClientes}
          estado={estado}
          onEstado={filtrar(setEstado)}
          conteos={conteos}
          plan={plan}
          onPlan={filtrar(setPlan)}
          orden={orden}
          onOrden={filtrar(setOrden)}
          etiquetaBusqueda={
            esClientes
              ? "Buscar por nombre o identificación…"
              : "Buscar en el equipo…"
          }
        />

        {total === 0 ? (
          <EstadoVacio onLimpiar={limpiar} />
        ) : (
          <>
            <CabeceraLista pestana={pestana} />
            <ul className="divide-y divide-beige">
              {esClientes
                ? listaClientes
                    .slice(inicio, inicio + POR_PAGINA)
                    .map((c) => (
                      <li key={c.id}>
                        <FilaCliente cliente={c} />
                      </li>
                    ))
                : listaEquipo
                    .slice(inicio, inicio + POR_PAGINA)
                    .map((m) => (
                      <li key={m.id}>
                        <FilaMiembro miembro={m} />
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
              sustantivo={esClientes ? "clientes" : "miembros del equipo"}
            />
          </>
        )}
      </Card>
      </div>
    </div>
  );
}
