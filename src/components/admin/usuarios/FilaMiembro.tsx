import Avatar from "./Avatar";
import { Pastilla } from "./EstadoBadge";
import { fechaCompacta } from "@/lib/admin/format";
import { REJILLA_EQUIPO } from "./rejilla";
import type { MiembroEquipo } from "@/lib/admin/types";

/**
 * Fila del equipo del estudio. Misma anatomía que `FilaCliente`, pero **no es
 * un enlace**: no hay ficha de miembro todavía y un enlace a ninguna parte es
 * peor que ningún enlace. Cuando exista, se convierte en `<Link>` igual que la
 * de clientes.
 */
export default function FilaMiembro({ miembro }: { miembro: MiembroEquipo }) {
  return (
    <div
      className={`${REJILLA_EQUIPO} min-h-[76px] gap-y-1 py-3 transition-colors duration-200 hover:bg-arena/70`}
    >
      <Avatar nombre={miembro.nombre} />

      <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 md:contents">
        <span className="min-w-0 basis-full md:basis-auto">
          <span className="block truncate font-display text-lg leading-tight text-verde">
            {miembro.nombre}
          </span>
          <span className="block truncate text-xs text-verde-300">
            {miembro.correo}
          </span>
        </span>

        <span className="min-w-0 text-sm text-verde-700">
          <span className="block truncate">{miembro.rol}</span>
          <span className="block text-xs tabular-nums text-verde-300">
            {miembro.clasesSemana > 0
              ? `${miembro.clasesSemana} clases/semana`
              : "Sin clases asignadas"}
          </span>
        </span>

        {miembro.activo ? (
          <Pastilla
            simbolo="●"
            texto="Activa"
            clase="border-[color-mix(in_srgb,var(--color-estado-ok)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-estado-ok)_10%,transparent)] text-[var(--color-estado-ok)]"
          />
        ) : (
          <Pastilla
            simbolo="○"
            texto="Inactiva"
            clase="border-beige bg-beige/40 text-verde-300"
          />
        )}

        {/* Sin ancho fijo: «Desde 5 feb 2024» no cabía en las 7rem que tenía y
            se salía de la fila. La columna es `auto`, así que se ajusta sola.

            El «Desde» solo se ve en móvil. En escritorio la columna ya dice qué
            es por su posición, y repetir la palabra en las seis filas es ruido —
            pero va `sr-only` y no `hidden`, porque un lector de pantalla no ve
            columnas y leería una fecha suelta sin saber de qué. */}
        <span className="whitespace-nowrap text-sm tabular-nums text-verde-300 md:text-right">
          <span className="md:sr-only">Desde </span>
          {fechaCompacta(miembro.alta)}
        </span>
      </span>
    </div>
  );
}
