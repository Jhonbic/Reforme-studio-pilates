"use client";

import { puedeMarcarAsistencia, resumenAsistencia } from "@/lib/admin/asistencia";
import { numero } from "@/lib/admin/format";
import { duracionLegible } from "@/lib/admin/horario";
import type { ClaseEnAgenda } from "@/lib/admin/types";
import EstadoClaseBadge from "./EstadoClaseBadge";

const ACCION =
  "control-fx relative inline-flex min-h-[44px] items-center justify-center overflow-hidden rounded-full border border-beige bg-white px-4 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado";
const PRINCIPAL =
  "inline-flex min-h-[44px] items-center justify-center rounded-full bg-verde px-4 text-sm font-medium text-arena transition-colors duration-300 hover:bg-verde-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado";

/**
 * Una clase en la rejilla del día (hora × sala).
 *
 * Sustituye a la fila de la lista (`FilaClase`): con dos salas, la agenda se
 * entiende mejor con el mismo dibujo que el horario semanal, y cada clase
 * ocupa su celda.
 *
 * El botón principal es lo que más se hace con una clase: ver y apuntar gente
 * («Reservas») o, ya empezada, pasar lista («Asistencia»). Antes era un enlace
 * diminuto bajo la barra de cupos y costaba encontrarlo.
 *
 * ⚠️ La tarjeta NO es un enlace ni un botón entero: dentro hay tres botones, y
 * un interactivo dentro de otro es marcado inválido y una trampa de teclado.
 */
export default function TarjetaClase({
  clase,
  puedeEditar,
  miEquipoId,
  onEditar,
  onQuitar,
  onReservas,
}: {
  clase: ClaseEnAgenda;
  puedeEditar: boolean;
  miEquipoId: string | null;
  onEditar: () => void;
  onQuitar: () => void;
  onReservas: () => void;
}) {
  /* Pasada o anulada no se toca: reprogramar el pasado no significa nada. Los
     botones desaparecen en vez de deshabilitarse: no hay ningún porqué que leer. */
  const editable = puedeEditar && (clase.estado === "Programada" || clase.estado === "Llena") && !clase.empezada;
  const hayReservas = clase.reservas > 0;
  const anulada = clase.estado === "Cancelada";
  const excepcional = anulada || clase.estado === "Finalizada";
  const ocupacion = clase.cupos ? (clase.reservas / clase.cupos) * 100 : 0;

  const marcable = puedeMarcarAsistencia(clase, puedeEditar, miEquipoId);
  const conAsistencia = clase.empezada && !anulada && hayReservas;
  const asistencia = resumenAsistencia(clase.reservados);
  const puedeApuntar = puedeEditar && (clase.estado === "Programada" || clase.estado === "Llena");
  const rotulo = marcable ? "Asistencia" : puedeApuntar ? "Reservas" : "Quién reservó";
  const que = `${clase.tipo} de las ${clase.horaInicio}`;

  return (
    <article
      className={`flex h-full flex-col gap-3 rounded-xl border p-3 sm:p-4 ${
        anulada ? "border-dashed border-beige bg-white" : "border-beige bg-white shadow-[var(--shadow-card)]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className={`text-base font-bold ${anulada ? "text-verde-300 line-through" : "text-verde"}`}>
            {clase.tipo}
            {/* Reformer y Mat ya dicen su sala con el nombre; la privada no. */}
            {clase.tipo === "Privada" && (
              <span className="font-normal text-verde-300"> · Sala de {clase.sala}</span>
            )}
          </h3>
          {/* La hora de inicio la dice la fila; aquí, quién y hasta cuándo. */}
          <p className="truncate text-sm text-verde-700">
            {clase.instructora}
            <span className="text-verde-300">
              {" "}
              · hasta <span className="font-cifra">{clase.horaFin}</span>
              <span className="sr-only"> (empieza a las {clase.horaInicio}, {duracionLegible(clase.duracionMin)})</span>
            </span>
          </p>
        </div>
        {excepcional && <EstadoClaseBadge estado={clase.estado} />}
      </div>

      {/* Cupos: la cifra es la información; la barra solo la refuerza. */}
      <div>
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="font-cifra text-verde">
            {numero(clase.reservas)} / {numero(clase.cupos)}
            <span className="text-verde-300"> reservas</span>
          </span>
          <span className="text-xs text-verde-300">
            {clase.libres === 0 ? "Sin cupos libres" : `${numero(clase.libres)} ${clase.libres === 1 ? "libre" : "libres"}`}
          </span>
        </div>
        <div aria-hidden="true" className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-beige">
          <div
            className={`h-full rounded-full ${anulada ? "bg-verde-300" : "bg-dorado"}`}
            style={{ width: `${Math.min(100, ocupacion)}%` }}
          />
        </div>
        {conAsistencia &&
          (marcable && asistencia.sinMarcar > 0 ? (
            <p className="mt-1.5 text-xs text-[var(--color-estado-aviso)]">
              ▲ {numero(asistencia.sinMarcar)} sin marcar asistencia
            </p>
          ) : asistencia.asistio + asistencia.noVino > 0 ? (
            <p className="mt-1.5 text-xs text-verde-700">
              ✓ {numero(asistencia.asistio)} de {numero(clase.reservas)}{" "}
              {asistencia.asistio === 1 ? "vino" : "vinieron"}
            </p>
          ) : null)}
      </div>

      <div className="mt-auto flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onReservas}
          className={`${puedeApuntar || marcable ? PRINCIPAL : ACCION} flex-1`}
          aria-label={`${rotulo} · ${que}`}
        >
          {rotulo}
        </button>
        {editable && (
          <>
            <button type="button" onClick={onEditar} className={ACCION} aria-label={`Editar ${que}`}>
              <span className="control-sheen" aria-hidden="true" />
              Editar
            </button>
            <button
              type="button"
              onClick={onQuitar}
              className={ACCION}
              aria-label={`${hayReservas ? "Cancelar" : "Eliminar"} ${que}`}
            >
              <span className="control-sheen" aria-hidden="true" />
              {hayReservas ? "Cancelar" : "Eliminar"}
            </button>
          </>
        )}
      </div>
    </article>
  );
}
