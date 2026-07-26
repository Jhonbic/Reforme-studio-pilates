import type { TonoCard } from "./Card";

export type TablaDatos = {
  cabeceras: string[];
  filas: (string | number)[][];
};

type Props = {
  tabla: TablaDatos;
  tono?: TonoCard;
};

/**
 * Vista de tabla del mismo dato que pinta el gráfico. NO es opcional por
 * capricho: la paleta de gráficos tiene un color (el dorado) por debajo de 3:1
 * de contraste sobre fondo claro, y eso obliga a ofrecer siempre una
 * alternativa legible. También es la salida para quien use lector de pantalla.
 *
 * Usa `<details>` nativo: funciona sin JavaScript y es accesible por defecto.
 */
export default function TablaDeDatos({ tabla, tono = "claro" }: Props) {
  const oscuro = tono === "oscuro";

  return (
    <details
      className={`group mt-4 border-t pt-3 ${
        oscuro ? "border-verde-700" : "border-beige"
      }`}
    >
      <summary
        className={`cursor-pointer list-none text-xs transition-colors ${
          oscuro
            ? "text-beige/75 hover:text-dorado-light"
            : "text-verde-300 hover:text-dorado-dark"
        }`}
      >
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="transition-transform group-open:rotate-90"
          >
            ›
          </span>
          Ver datos en tabla
        </span>
      </summary>

      {/* La tabla puede desbordar en móvil: scrollea ella, nunca la página */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[380px] border-collapse text-left text-sm">
          <thead>
            <tr className={oscuro ? "border-b border-verde-700" : "border-b border-beige"}>
              {tabla.cabeceras.map((c, i) => (
                <th
                  key={c}
                  scope="col"
                  className={`py-2 pr-4 font-sans text-xs font-normal uppercase tracking-wider ${
                    oscuro ? "text-beige/70" : "text-verde-300"
                  } ${i > 0 ? "text-right" : ""}`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabla.filas.map((fila, f) => (
              <tr
                key={`${String(fila[0])}-${f}`}
                className={`border-b last:border-0 ${
                  oscuro ? "border-verde-700/60" : "border-beige/60"
                }`}
              >
                {fila.map((celda, i) => (
                  <td
                    key={i}
                    className={`py-2 pr-4 tabular-nums ${
                      oscuro ? "text-arena" : "text-verde"
                    } ${i > 0 ? "text-right" : "font-medium"}`}
                  >
                    {celda}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
