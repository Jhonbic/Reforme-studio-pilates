import Link from "next/link";
import { diaRelativo } from "@/lib/admin/horario";
import type { ClaseParaCliente } from "@/lib/cliente/datos";

/**
 * «Con cupo para ti»: hasta tres próximas clases que puede reservar con un
 * toque (las filtra `conCupoParaMi`). «Reservar» abre la hoja de la clase,
 * que confirma antes (`HojaClase`). Si no hay ninguna, no se pinta.
 */
export default function ConCupo({
  clases,
  hoy,
  onReservar,
}: {
  clases: ClaseParaCliente[];
  hoy: string;
  onReservar: (c: ClaseParaCliente) => void;
}) {
  if (clases.length === 0) return null;
  return (
    <section aria-labelledby="con-cupo">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="con-cupo" className="font-display text-2xl text-verde">
          Con cupo para ti
        </h2>
        <Link
          href="/mi-cuenta/reservar"
          className="inline-flex min-h-[44px] items-center gap-1 text-sm text-dorado-tinta underline-offset-4 hover:underline"
        >
          Ver agenda <span aria-hidden="true">→</span>
        </Link>
      </div>
      <ul className="mt-2 divide-y divide-beige overflow-hidden rounded-3xl border border-beige bg-white shadow-soft">
        {clases.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-dorado-tinta first-letter:uppercase">
                {diaRelativo(c.fecha, hoy)}
              </p>
              <p className="font-cifra text-lg font-normal text-verde">
                {c.horaInicio} <span className="text-verde-300">→ {c.horaFin}</span>
                <span className="ml-2 font-sans text-xs text-verde-300">
                  {c.libres} {c.libres === 1 ? "libre" : "libres"}
                </span>
              </p>
              <p className="truncate text-sm text-verde-700">
                <span className="font-bold text-verde">{c.tipo}</span> · {c.instructora}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onReservar(c)}
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full bg-dorado px-5 text-sm font-medium text-verde-900 transition-colors duration-300 hover:bg-dorado-dark"
              aria-label={`Reservar ${c.tipo}, ${diaRelativo(c.fecha, hoy).toLowerCase()} a las ${c.horaInicio}`}
            >
              Reservar
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
