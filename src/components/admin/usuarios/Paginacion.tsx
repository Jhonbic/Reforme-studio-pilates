"use client";

import { numero } from "@/lib/admin/format";

type Props = {
  pagina: number;
  totalPaginas: number;
  total: number;
  desde: number;
  hasta: number;
  onPagina: (p: number) => void;
  /** "clientes" / "miembros": lo que se está contando. */
  sustantivo: string;
};

/**
 * Ventana de números alrededor de la página actual, con elipsis. Con 10 páginas
 * caben todas, pero la lista crece con el estudio y una tira de 40 números
 * rompería la barra.
 */
function paginasVisibles(pagina: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const cerca = [pagina - 1, pagina, pagina + 1].filter(
    (p) => p > 1 && p < total,
  );
  const salida: (number | "…")[] = [1];
  if (cerca[0] > 2) salida.push("…");
  salida.push(...cerca);
  if (cerca[cerca.length - 1] < total - 1) salida.push("…");
  salida.push(total);
  return salida;
}

/* `min-w-[44px]` ya da de sobra para dos cifras, así que el `px` solo entra en
   juego a partir de tres. Se queda en `px-2` para no ensanchar la tira sin
   necesidad: con nueve botones, cada 4px de más son 36px de fila. */
const BOTON =
  "control-fx relative flex min-h-[44px] min-w-[44px] items-center justify-center overflow-hidden rounded-full px-2 text-sm transition-colors duration-300";

/** El dash diagonal dorado, la respuesta al hover de todos los controles. */
function Dash() {
  return <span className="control-sheen" aria-hidden="true" />;
}

export default function Paginacion({
  pagina,
  totalPaginas,
  total,
  desde,
  hasta,
  onPagina,
  sustantivo,
}: Props) {
  return (
    <div className="flex flex-col items-center gap-3 border-t border-beige px-4 py-3 sm:px-5 md:flex-row md:justify-between">
      {/* `aria-live` para que quien no ve la lista se entere de que cambió al
          pulsar una página: el foco se queda en el botón, no viaja al listado. */}
      <p aria-live="polite" className="text-sm text-verde-300">
        Mostrando{" "}
        <span className="tabular-nums text-verde-700">
          {numero(desde)}–{numero(hasta)}
        </span>{" "}
        de <span className="tabular-nums text-verde-700">{numero(total)}</span>{" "}
        {sustantivo}
      </p>

      {totalPaginas > 1 && (
        <nav aria-label="Paginación" className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPagina(pagina - 1)}
            disabled={pagina === 1}
            aria-label="Página anterior"
            className={`${BOTON} text-verde-700 disabled:opacity-35`}
          >
            {/* Sin dash cuando está deshabilitado: barrer un botón que no hace
                nada al pulsarlo dice justo lo contrario de lo que pasa. */}
            {pagina !== 1 && <Dash />}
            <span aria-hidden="true">‹</span>
          </button>

          {/* ⚠️ En móvil la tira de números NO cabe: con 10 páginas son nueve
              objetivos táctiles de 44px, o sea ~430px, y la pantalla tiene 375.
              Se desbordaba con scroll horizontal. Aquí se sustituye por un
              «4 / 10» compacto; la posición exacta ya la da el «Mostrando
              37–48 de 118» de al lado. */}
          <span className="px-3 text-sm tabular-nums text-verde-700 sm:hidden">
            {numero(pagina)} / {numero(totalPaginas)}
          </span>

          <span className="hidden items-center gap-0.5 sm:flex">
            {paginasVisibles(pagina, totalPaginas).map((p, i) =>
              p === "…" ? (
                <span
                  key={`hueco-${i}`}
                  aria-hidden="true"
                  className="px-0.5 text-verde-300"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPagina(p)}
                  aria-current={p === pagina ? "page" : undefined}
                  aria-label={`Página ${p}`}
                  className={`${BOTON} tabular-nums ${
                    /* Mismo dorado que la pestaña y la pastilla activas: si la
                       página actual se marcara en verde, en la misma pantalla
                       habría dos idiomas para «esto es lo seleccionado». */
                    p === pagina ? "bg-dorado text-verde-900" : "text-verde-700"
                  }`}
                >
                  {p !== pagina && <Dash />}
                  {p}
                </button>
              ),
            )}
          </span>

          <button
            type="button"
            onClick={() => onPagina(pagina + 1)}
            disabled={pagina === totalPaginas}
            aria-label="Página siguiente"
            className={`${BOTON} text-verde-700 disabled:opacity-35`}
          >
            {pagina !== totalPaginas && <Dash />}
            <span aria-hidden="true">›</span>
          </button>
        </nav>
      )}
    </div>
  );
}
