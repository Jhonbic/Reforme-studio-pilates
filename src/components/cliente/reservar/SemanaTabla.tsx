import { diaCorto, diaLargo, numeroDia } from "@/lib/admin/horario";
import type { ClaseParaCliente } from "@/lib/cliente/datos";
import { diasDeSemana, horasDe, porSala, type EstadoParaMi } from "@/lib/cliente/reservar";
import CeldaClase from "./CeldaClase";

/**
 * La semana entera como el horario de un gimnasio (solo ESCRITORIO): una fila
 * por hora con clase, una columna por día, y en cada celda las clases de esa
 * hora (Reformer encima de Mat, separadas por una línea). Celdas planas, como
 * la tabla del día en el móvil. Es una `<table>` de verdad: filas y columnas
 * con sus encabezados, así un lector de pantalla dice «martes 17, 07:00».
 */
export default function SemanaTabla({
  lunes,
  hoy,
  clases,
  estadoDe,
  onAbrir,
}: {
  lunes: string;
  hoy: string;
  /** Las clases de ESA semana. */
  clases: ClaseParaCliente[];
  estadoDe: (c: ClaseParaCliente) => EstadoParaMi;
  onAbrir: (c: ClaseParaCliente) => void;
}) {
  const dias = diasDeSemana(lunes);
  if (clases.length === 0) {
    return (
      <p className="hidden rounded-3xl border border-beige bg-white p-8 text-center text-sm text-verde-700 lg:block">
        No hay clases programadas esta semana.
      </p>
    );
  }
  return (
    <div className="hidden overflow-hidden rounded-3xl border border-beige bg-white shadow-soft lg:block">
      <table className="w-full table-fixed border-collapse">
        <caption className="sr-only">Clases de la semana</caption>
        <thead>
          <tr className="border-b border-beige bg-arena/60">
            <th scope="col" className="w-16">
              <span className="sr-only">Hora</span>
            </th>
            {dias.map((d) => (
              <th
                key={d}
                scope="col"
                className={`border-l border-beige px-1 py-3 text-center font-normal ${d < hoy ? "text-verde-300/70" : "text-verde-700"}`}
              >
                <span className="sr-only">{diaLargo(d)}</span>
                <span aria-hidden="true" className="block text-[11px] uppercase tracking-wide">
                  {diaCorto(d)}
                </span>
                <span
                  aria-hidden="true"
                  className={`mx-auto mt-0.5 flex size-8 items-center justify-center rounded-full font-cifra text-base ${
                    d === hoy ? "bg-verde text-arena" : ""
                  }`}
                >
                  {numeroDia(d)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {horasDe(clases).map((h) => (
            <tr key={h} className="border-b border-beige/70 last:border-b-0">
              <th scope="row" className="px-3 py-3 text-right align-top font-cifra text-sm font-normal text-verde-700">
                {h}
              </th>
              {dias.map((d) => {
                const enCelda = clases.filter((c) => c.fecha === d && c.horaInicio === h).sort(porSala);
                return (
                  <td
                    key={d}
                    className={`h-px border-l border-beige/70 p-0 align-top ${d === hoy ? "bg-dorado/5" : ""}`}
                  >
                    {enCelda.length === 0 ? (
                      <span className="sr-only">Sin clase</span>
                    ) : (
                      <div className="flex h-full flex-col divide-y divide-beige/70">
                        {enCelda.map((c) => (
                          <div key={c.id} className="flex-1">
                            <CeldaClase clase={c} estado={estadoDe(c)} conTipo onAbrir={onAbrir} />
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
