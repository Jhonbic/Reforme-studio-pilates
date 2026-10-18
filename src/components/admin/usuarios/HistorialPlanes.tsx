import Pastilla, { TONO_ESTADO } from "@/components/admin/Pastilla";
import { fechaCompacta, moneda, numero } from "@/lib/admin/format";
import type { PlanAdquirido } from "@/lib/admin/types";

/** En qué punto está cada plan respecto a hoy. */
function estadoDe(p: PlanAdquirido, hoy: string) {
  if (p.inicio > hoy) return { simbolo: "◇", texto: "Próximo", tono: TONO_ESTADO.neutro };
  if (p.vencimiento >= hoy) return { simbolo: "●", texto: "Vigente", tono: TONO_ESTADO.ok };
  /* Neutro y no rojo: un plan que ya terminó es historia, no una alarma. Que
     el cliente esté vencido HOY ya lo dice la pastilla de la cabecera. */
  return { simbolo: "○", texto: "Terminado", tono: TONO_ESTADO.neutro };
}

/** Fusión: «12 Reformer + 4 Mat». Una sola modalidad: «8 clases» (la
 *  modalidad ya va delante; «Mat · 8 Mat» la repetía). */
function clasesDe(p: PlanAdquirido): string {
  if (p.clasesReformer > 0 && p.clasesMat > 0) return `${p.clasesReformer} Reformer + ${p.clasesMat} Mat`;
  const n = p.clasesReformer + p.clasesMat;
  return n > 0 ? `${n} ${n === 1 ? "clase" : "clases"}` : "Sin clases incluidas";
}

/**
 * Los planes que ha comprado un cliente, del más reciente al más antiguo
 * (como el «Historial de suscripciones» de JainSportBox).
 *
 * El importe es el que se cobró entonces: cambiar el precio del plan después
 * no lo toca. «Pagó» solo sale para el mostrador (`pagado` no nulo): RLS no le
 * da los pagos a la instructora.
 */
export default function HistorialPlanes({ planes, hoy }: { planes: PlanAdquirido[]; hoy: string }) {
  if (planes.length === 0) {
    return <p className="mt-4 text-sm text-verde-300">Todavía no ha comprado ningún plan.</p>;
  }

  const verPagos = planes[0].pagado !== null;
  const total = planes.reduce((t, p) => t + p.importe, 0);

  return (
    <div className="mt-4">
      <p className="text-sm text-verde-700">
        <span className="font-cifra">{numero(planes.length)}</span>{" "}
        {planes.length === 1 ? "plan comprado" : "planes comprados"}
        <span className="text-verde-300">
          {" "}· <span className="font-cifra">{moneda(total)}</span> en total
        </span>
      </p>
      <ul className="mt-3 divide-y divide-beige rounded-xl border border-beige">
        {planes.map((p) => {
          const e = estadoDe(p, hoy);
          const debe = p.pagado !== null ? p.importe - p.pagado : 0;
          return (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              {/* En móvil, apilado; desde `sm`, en columnas. */}
              <div className="min-w-0 flex-1 sm:grid sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1fr)] sm:items-center sm:gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-verde">{p.plan}</p>
                  <p className="truncate text-xs text-verde-300">
                    {p.modalidad} · {clasesDe(p)}
                  </p>
                </div>
                <p className="mt-1 font-cifra text-sm text-verde-700 sm:mt-0">
                  {fechaCompacta(p.inicio)} – {fechaCompacta(p.vencimiento)}
                </p>
                <div className="mt-1 sm:mt-0">
                  <p className="font-cifra text-sm text-verde-700">{moneda(p.importe)}</p>
                  {verPagos && (
                    <p
                      className={`text-xs ${
                        debe > 0 ? "text-[var(--color-estado-aviso)]" : "text-verde-300"
                      }`}
                    >
                      {debe > 0 ? `Debe ${moneda(debe)}` : "Pagado"}
                    </p>
                  )}
                </div>
              </div>
              {/* Ancho fijo: «Próximo» y «Terminado» no miden igual, y sin esto
                  las columnas de la izquierda bailaban de una fila a otra. */}
              <span className="flex w-28 shrink-0 justify-end">
                <Pastilla simbolo={e.simbolo} texto={e.texto} clase={e.tono} />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
