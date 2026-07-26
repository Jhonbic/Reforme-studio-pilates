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

/** Huecos de la tira. Impar a propósito: la página actual va justo en medio. */
const RANURAS = 7;

/**
 * Ventana de números alrededor de la página actual, con elipsis. Con 10 páginas
 * caben todas, pero la lista crece con el estudio y una tira de 40 números
 * rompería la barra.
 *
 * ⚠️ **Devuelve SIEMPRE el mismo número de ranuras** (`RANURAS`, salvo listas
 * cortas donde caben todas). Antes la tira crecía y encogía al cambiar de
 * página —en la 1 salían 5 huecos y en la 3 salían 7—, y como la barra alinea a
 * la derecha, las flechas y los números **se desplazaban bajo el cursor** justo
 * después de pulsar: parecía que la barra se expandía. Cerca de los extremos la
 * ventana no se recorta, se **desplaza**: `1 2 3 4 5 … 10` en vez de
 * `1 2 … 10`.
 */
function paginasVisibles(pagina: number, total: number): (number | "…")[] {
  if (total <= RANURAS)
    return Array.from({ length: total }, (_, i) => i + 1);
  // 4 = primera página + elipsis + los dos vecinos que caben antes del actual.
  if (pagina <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (pagina >= total - 3)
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", pagina - 1, pagina, pagina + 1, "…", total];
}

/* `min-w-[44px]` ya da de sobra para dos cifras, así que el `px` solo entra en
   juego a partir de tres. Se queda en `px-2` para no ensanchar la tira sin
   necesidad: con nueve botones, cada 4px de más son 36px de fila. */
const BOTON =
  "control-fx relative flex min-h-[44px] min-w-[44px] items-center justify-center overflow-hidden rounded-full border border-transparent px-2 text-sm transition-[color,background-color,border-color] duration-300";

/* El borde va SIEMPRE, transparente en reposo: así al encenderse en dorado no
   cambia el ancho y la tira no se mueve 1px. Misma razón que en las pestañas. */
const BOTON_INACTIVO =
  "text-verde-700 hover:border-dorado/60 hover:text-verde focus-visible:border-dorado/60";

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
            className={`${BOTON} ${BOTON_INACTIVO} disabled:opacity-35 disabled:hover:border-transparent`}
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
          {/* `min-w` para que «1 / 10» y «10 / 10» ocupen lo mismo: si no, las
              flechas bailan al cambiar de página. */}
          <span className="min-w-[76px] px-3 text-center text-sm tabular-nums text-verde-700 sm:hidden">
            {numero(pagina)} / {numero(totalPaginas)}
          </span>

          <span className="hidden items-center gap-0.5 sm:flex">
            {paginasVisibles(pagina, totalPaginas).map((p, i) =>
              p === "…" ? (
                /* La elipsis mide lo MISMO que un botón: es la otra mitad de
                   que la tira no cambie de ancho. Con ella más estrecha, pasar
                   de `1 … 3 4 5 … 10` a `1 2 3 4 5 … 10` seguiría moviendo la
                   fila aunque el número de ranuras fuese el mismo. */
                <span
                  key={`hueco-${i}`}
                  aria-hidden="true"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center text-verde-300"
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
                    p === pagina
                      ? "border-dorado bg-dorado text-verde-900"
                      : BOTON_INACTIVO
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
            className={`${BOTON} ${BOTON_INACTIVO} disabled:opacity-35 disabled:hover:border-transparent`}
          >
            {pagina !== totalPaginas && <Dash />}
            <span aria-hidden="true">›</span>
          </button>
        </nav>
      )}
    </div>
  );
}
