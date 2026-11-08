import { diaRelativo } from "@/lib/admin/horario";
import type { ClaseParaCliente } from "@/lib/cliente/datos";
import { horasDe, type EstadoParaMi } from "@/lib/cliente/reservar";
import CeldaClase from "./CeldaClase";

/**
 * Las dos salas, cada una en su columna. Una privada va en la que esté libre
 * a esa hora: hay dos salas, así que a una misma hora caben como mucho dos.
 */
function porColumna(clases: ClaseParaCliente[]): [ClaseParaCliente | undefined, ClaseParaCliente | undefined] {
  let reformer = clases.find((c) => c.tipo === "Reformer");
  let mat = clases.find((c) => c.tipo === "Mat");
  for (const p of clases.filter((c) => c.tipo === "Privada")) {
    if (!reformer) reformer = p;
    else if (!mat) mat = p;
  }
  return [reformer, mat];
}

function Vacia() {
  return (
    <span className="flex h-full min-h-[60px] items-center px-3 text-verde-300/60">
      <span aria-hidden="true">—</span>
      <span className="sr-only">Sin clase</span>
    </span>
  );
}

/**
 * El día elegido como TABLA (solo MÓVIL; en escritorio está la de la semana):
 * Hora · Reformer · Mat, una fila por hora con clase. Una sola tarjeta con
 * líneas entre filas y columnas, no bloques sueltos (decisión del usuario,
 * nov 2026). Cada sala siempre en su columna, para leerla de reojo.
 */
export default function DiaPorHoras({
  dia,
  hoy,
  clases,
  estadoDe,
  onAbrir,
}: {
  dia: string;
  hoy: string;
  /** Las clases de ESE día. */
  clases: ClaseParaCliente[];
  estadoDe: (c: ClaseParaCliente) => EstadoParaMi;
  onAbrir: (c: ClaseParaCliente) => void;
}) {
  return (
    <section aria-labelledby="dia-elegido" className="lg:hidden">
      <h2 id="dia-elegido" className="text-sm font-medium text-dorado-tinta first-letter:uppercase">
        {diaRelativo(dia, hoy)}
      </h2>
      {clases.length === 0 ? (
        <p className="mt-3 rounded-3xl border border-beige bg-white p-6 text-center text-sm text-verde-700">
          No hay clases este día.
        </p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-3xl border border-beige bg-white shadow-soft">
          <table className="w-full table-fixed border-collapse">
            <caption className="sr-only">Clases del {diaRelativo(dia, hoy).toLowerCase()}</caption>
            <thead>
              <tr className="border-b border-beige bg-arena/60 text-[11px] uppercase tracking-wider text-verde-300">
                <th scope="col" className="w-16 py-3 pl-4 text-left font-normal">
                  Hora
                </th>
                <th scope="col" className="border-l border-beige px-3 py-3 text-left font-normal">
                  Reformer
                </th>
                <th scope="col" className="border-l border-beige px-3 py-3 text-left font-normal">
                  Mat
                </th>
              </tr>
            </thead>
            <tbody>
              {horasDe(clases).map((h) => {
                const [reformer, mat] = porColumna(clases.filter((c) => c.horaInicio === h));
                return (
                  <tr key={h} className="border-b border-beige/70 last:border-b-0">
                    <th scope="row" className="py-3 pl-4 text-left align-middle font-cifra text-sm font-normal text-verde-700">
                      {h}
                    </th>
                    {[reformer, mat].map((c, i) => (
                      /* `h-px` + `h-full` en el botón: así la celda entera es
                         pulsable aunque la de al lado sea más alta. */
                      <td key={i} className="h-px border-l border-beige/70 p-0">
                        {c ? <CeldaClase clase={c} estado={estadoDe(c)} onAbrir={onAbrir} /> : <Vacia />}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
