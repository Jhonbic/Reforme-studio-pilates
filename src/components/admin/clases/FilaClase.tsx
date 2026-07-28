"use client";

import { numero } from "@/lib/admin/format";
import { duracionLegible } from "@/lib/admin/horario";
import type { ClaseEnAgenda } from "@/lib/admin/types";
import EstadoClaseBadge from "./EstadoClaseBadge";

const ACCION =
  "control-fx relative inline-flex min-h-[44px] items-center justify-center overflow-hidden rounded-full border border-beige px-4 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado";

/**
 * Una clase en la agenda del día.
 *
 * ⚠️ **La fila NO es un enlace**, al revés que la del listado de Usuarios: no
 * hay ficha de clase a la que ir, y sí hay dos botones dentro. Envolver todo en
 * un `<a>` con botones anidados es marcado inválido y una trampa para el
 * teclado.
 *
 * ⚠️ **Un solo DOM para móvil y escritorio.** Es una rejilla que cambia de
 * plantilla, no dos versiones con `hidden`/`md:block`: duplicar el marcado
 * duplicaría el contenido para los lectores de pantalla. Misma regla que
 * `FilaCliente`.
 */
export default function FilaClase({
  clase,
  onEditar,
  onQuitar,
}: {
  clase: ClaseEnAgenda;
  onEditar: () => void;
  onQuitar: () => void;
}) {
  /* Una clase que ya pasó o que se anuló no se toca: reprogramar el pasado no
     significa nada, y «editar» una cancelada esconde que lo que hay que hacer es
     crear otra. Por eso desaparecen los botones en vez de deshabilitarse: aquí
     no hay ningún porqué que leer, a diferencia del alta de cliente. */
  const editable = clase.estado === "Programada" || clase.estado === "Llena";

  /* Cancelar y eliminar NO son lo mismo, y lo que los separa es si hay alguien
     dentro. Ver el diálogo de `PanelClases`. */
  const hayReservas = clase.reservas > 0;

  const ocupacion = clase.cupos ? (clase.reservas / clase.cupos) * 100 : 0;
  const anulada = clase.estado === "Cancelada";

  /* Los dos estados que merecen pastilla: los que se salen de lo esperado. Ver
     la nota de abajo. */
  const excepcional = anulada || clase.estado === "Finalizada";

  return (
    <li className="grid gap-3 border-t border-beige px-4 py-4 sm:px-5 md:grid-cols-[7rem_minmax(0,1fr)_8rem_auto] md:items-center md:gap-4">
      {/* Hora — la columna por la que se recorre la agenda en vertical */}
      <div className="flex items-baseline gap-2 md:block">
        <p
          className={`font-display text-xl tabular-nums ${
            anulada ? "text-verde-300 line-through" : "text-verde"
          }`}
        >
          {clase.horaInicio}
          <span className="text-verde-300"> → {clase.horaFin}</span>
        </p>
        <p className="text-xs text-verde-300">
          {duracionLegible(clase.duracionMin)}
        </p>
      </div>

      {/* Qué y quién */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={`truncate font-display text-lg ${
              anulada ? "text-verde-300" : "text-verde"
            }`}
          >
            {clase.tipo}
          </p>
          {/* ⚠️ **Solo se pintan «Cancelada» y «Finalizada».** «Programada» es lo
              normal —una pastilla en todas las filas no distingue ninguna— y
              «Llena» ya lo dice el cupo de al lado, literalmente («8 / 8
              reservas · Sin cupos libres»). Repetirlo en una pastilla de color
              era decir dos veces lo mismo y gastar una columna entera en ello.
              El estado completo sigue existiendo en los datos: es lo que decide
              si la fila tiene botones. */}
          {excepcional && <EstadoClaseBadge estado={clase.estado} />}
        </div>
        <p className="truncate text-sm text-verde-700">
          {/* El rótulo va visible y no `sr-only`: esta lista no tiene cabecera de
              columnas, así que no hay nada que rotule este dato salvo él mismo.
              Sin él, «Ana María Solano» podría ser cualquier cosa. */}
          <span className="text-verde-300">Instructora · </span>
          {clase.instructora}
        </p>
      </div>

      {/* Cupos */}
      <div>
        <p className="text-sm tabular-nums text-verde">
          {numero(clase.reservas)} / {numero(clase.cupos)}
          <span className="text-verde-300"> reservas</span>
        </p>
        {/* La barra es un refuerzo, nunca la información: la cifra exacta está
            justo encima, así que va `aria-hidden`. Codificar la ocupación solo
            con longitud dejaría fuera a quien no la ve. */}
        <div
          aria-hidden="true"
          className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-beige"
        >
          <div
            className={`h-full rounded-full ${anulada ? "bg-verde-300" : "bg-dorado"}`}
            style={{ width: `${Math.min(100, ocupacion)}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-verde-300">
          {clase.libres === 0
            ? "Sin cupos libres"
            : `${numero(clase.libres)} ${clase.libres === 1 ? "libre" : "libres"}`}
        </p>
      </div>

      {/* Acciones. En móvil ocupan el ancho para que sean fáciles de acertar. */}
      {editable && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEditar}
            className={`${ACCION} flex-1 md:flex-none`}
            /* El qué y el cuándo van en el nombre accesible: con seis clases en
               la pantalla, seis botones «Editar» seguidos no dicen cuál es cuál. */
            aria-label={`Editar la clase de ${clase.tipo} de las ${clase.horaInicio}`}
          >
            <span className="control-sheen" aria-hidden="true" />
            Editar
          </button>
          <button
            type="button"
            onClick={onQuitar}
            className={`${ACCION} flex-1 md:flex-none`}
            aria-label={`${hayReservas ? "Cancelar" : "Eliminar"} la clase de ${clase.tipo} de las ${clase.horaInicio}`}
          >
            <span className="control-sheen" aria-hidden="true" />
            {hayReservas ? "Cancelar" : "Eliminar"}
          </button>
        </div>
      )}
    </li>
  );
}
