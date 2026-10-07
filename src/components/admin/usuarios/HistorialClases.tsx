import Pastilla, { TONO_ESTADO } from "@/components/admin/Pastilla";
import { fechaCompacta, numero } from "@/lib/admin/format";
import type { ClaseDelCliente } from "@/lib/admin/types";

/** Qué pasó con cada reserva, en el idioma de las pastillas del panel. */
function estadoDe(c: ClaseDelCliente) {
  if (c.cancelada) return { simbolo: "○", texto: "Clase cancelada", tono: TONO_ESTADO.neutro };
  if (!c.empezada) return { simbolo: "◇", texto: "Próxima", tono: TONO_ESTADO.neutro };
  if (c.asistencia === "Asistió") return { simbolo: "✓", texto: "Asistió", tono: TONO_ESTADO.ok };
  if (c.asistencia === "No vino") return { simbolo: "✕", texto: "No vino", tono: TONO_ESTADO.grave };
  /* Neutro y no ámbar: aquí no se puede resolver (se marca en la agenda), y
     todo lo anterior a oct 2026 está sin marcar porque no había dónde. Un muro
     de avisos que nadie puede atender deja de avisar. */
  return { simbolo: "◌", texto: "Sin marcar", tono: TONO_ESTADO.neutro };
}

/**
 * Las últimas clases que ha reservado un cliente, con su asistencia.
 *
 * Es lo que se mira cuando alguien dice «yo sí vine» o cuando se quiere saber
 * si una persona falta mucho. Solo lectura: la asistencia se marca desde la
 * agenda, en la clase, que es donde está la instructora.
 *
 * ⚠️ El recuento de arriba es solo de lo MARCADO: una clase sin marcar no es
 * ni una falta ni una visita.
 */
export default function HistorialClases({ clases }: { clases: ClaseDelCliente[] }) {
  if (clases.length === 0) {
    return <p className="mt-4 text-sm text-verde-300">Todavía no ha reservado ninguna clase.</p>;
  }

  const asistio = clases.filter((c) => !c.cancelada && c.asistencia === "Asistió").length;
  const noVino = clases.filter((c) => !c.cancelada && c.asistencia === "No vino").length;
  const marcadas = asistio + noVino;

  return (
    <div className="mt-4">
      {marcadas > 0 && (
        <p className="text-sm text-verde-700">
          Vino a <span className="font-cifra">{numero(asistio)}</span> de{" "}
          <span className="font-cifra">{numero(marcadas)}</span>{" "}
          {marcadas === 1 ? "clase marcada" : "clases marcadas"}
          {clases.length > 1 && <span className="text-verde-300"> · últimas {numero(clases.length)} reservas</span>}
        </p>
      )}
      <ul className="mt-3 divide-y divide-beige rounded-xl border border-beige">
        {clases.map((c) => {
          const e = estadoDe(c);
          return (
            /* En móvil, fecha arriba y clase debajo: en una sola línea con la
               pastilla, el tipo se cortaba en «Refor…». */
            <li key={c.reservaId} className="flex min-h-[52px] items-center gap-3 px-4 py-2">
              <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-4">
                <p className="shrink-0 font-cifra text-sm text-verde sm:w-40">
                  {fechaCompacta(c.fecha)} · {c.horaInicio}
                </p>
                <p
                  className={`min-w-0 truncate text-sm ${c.cancelada ? "text-verde-300 line-through" : "text-verde-700"}`}
                >
                  <span className="font-bold">{c.tipo}</span>
                  <span className="text-verde-300"> · {c.instructora}</span>
                </p>
              </div>
              <Pastilla simbolo={e.simbolo} texto={e.texto} clase={e.tono} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
