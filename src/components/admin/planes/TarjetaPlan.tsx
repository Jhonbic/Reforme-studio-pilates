"use client";

import Card from "@/components/admin/Card";
import Dropdown, {
  DropdownDivider,
  DropdownItem,
} from "@/components/admin/Dropdown";
import { moneda, numero } from "@/lib/admin/format";
import type { PlanConMetricas } from "@/lib/admin/types";

/** Cómo se dice la vigencia sin que parezca una cuenta de días. */
export function vigencia(dias: number): string {
  if (dias === 1) return "clase";
  if (dias % 30 === 0) {
    const meses = dias / 30;
    return meses === 1 ? "mes" : `${meses} meses`;
  }
  return `${numero(dias)} días`;
}

/**
 * Un plan como tarjeta de precio.
 *
 * Sustituye a la fila de listado: un plan se vende por lo que incluye, y una
 * fila no tiene sitio para enumerarlo. En tarjetas, las cuatro modalidades se
 * comparan en vertical —precio contra precio, característica contra
 * característica— que es justo lo que hace quien elige.
 *
 * ⚠️ **La destacada es la de más clientes, no una elegida a mano.** Marcar
 * «la popular» a dedo es una decisión de marketing que aquí no toca: el panel
 * es una herramienta interna, y lo útil es ver cuál se vende de verdad.
 */
export default function TarjetaPlan({
  plan,
  destacado,
  onEditar,
  onEliminar,
}: {
  plan: PlanConMetricas;
  destacado: boolean;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  return (
    /* `w-full`: sin él la tarjeta medía lo que su contenido y no lo que su
       hueco de la rejilla, y la destacada (nombre más largo) salía más ancha
       que sus vecinas. */
    <Card
      tono={destacado ? "oscuro" : "claro"}
      className="flex w-full flex-col"
      as="article"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {/* ⚠️ Ranura de altura fija para el distintivo, aunque no haya
              ninguno: si solo existiera en la destacada, su precio quedaría una
              línea por debajo del de las vecinas. Pastilla de UNA línea: como
              eyebrow, «El más contratado» se partía en dos. */}
          <div className="min-h-[1.75rem]">
            {destacado ? (
              <span className="inline-flex whitespace-nowrap rounded-full bg-dorado px-2.5 py-0.5 text-xs font-bold text-verde-900">
                ★ El más contratado
              </span>
            ) : (
              !plan.seVende && (
                <span className="inline-flex rounded-full border border-beige bg-beige/40 px-2.5 py-0.5 text-xs text-verde-300">
                  ○ No se vende
                </span>
              )
            )}
          </div>
          <h3
            className={`mt-1 text-lg font-bold leading-tight ${
              destacado ? "text-arena" : "text-verde"
            }`}
          >
            {plan.nombreVisible}
          </h3>
        </div>

        <Dropdown
          alineacion="derecha"
          ariaLabel={`Acciones de ${plan.nombreVisible}`}
          claseBoton={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado ${
            destacado
              ? "border-verde-700 text-beige hover:border-dorado"
              : "border-beige text-verde-300 hover:border-dorado hover:text-verde"
          }`}
          etiqueta={
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <circle cx="12" cy="5" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="12" cy="19" r="1.6" />
            </svg>
          }
        >
          <DropdownItem onClick={onEditar}>Editar plan</DropdownItem>
          <DropdownDivider />
          <DropdownItem onClick={onEliminar}>Eliminar plan</DropdownItem>
        </Dropdown>
      </div>

      {/* El precio, que es a lo que se viene. La unidad al lado y en pequeño:
          «$190.000 / mes» se lee de un golpe, «$190.000 cada 30 días» no. */}
      <p className="mt-4 flex flex-wrap items-baseline gap-x-1.5">
        <span
          className={`font-cifra text-4xl leading-none ${
            destacado ? "text-arena" : "text-verde"
          }`}
        >
          {moneda(plan.precio)}
        </span>
        <span
          className={`text-sm ${destacado ? "text-beige/75" : "text-verde-300"}`}
        >
          / {vigencia(plan.vigenciaDias)}
        </span>
      </p>

      {/* Lo que trae, una sola vez: antes la descripción («Plan Mat»), esta
          línea y una característica («Clases de Mat») decían lo mismo. Y el
          precio por clase, que es lo que sirve para comparar planes. */}
      <p
        className={`mt-4 text-base font-bold ${
          destacado ? "text-dorado-light" : "text-dorado-dark"
        }`}
      >
        {plan.modalidad === "Fusión"
          ? `${numero(plan.clasesReformer)} Reformer + ${numero(plan.clasesMat)} Mat`
          : `${numero(plan.clasesIncluidas)} ${plan.clasesIncluidas === 1 ? "clase" : "clases"} de ${plan.modalidad}`}
      </p>
      {plan.clasesIncluidas > 0 && (
        <p className={`mt-0.5 text-xs ${destacado ? "text-beige/75" : "text-verde-300"}`}>
          {moneda(Math.round(plan.precio / plan.clasesIncluidas))} por clase
        </p>
      )}

      {plan.descripcion && (
        <p className={`mt-3 text-sm ${destacado ? "text-beige/85" : "text-verde-700"}`}>
          {plan.descripcion}
        </p>
      )}

      {/* `flex-1` empuja las métricas al fondo, así las tarjetas alinean su pie
          aunque tengan distinto número de características. */}
      <ul className="mt-4 flex-1 space-y-2.5">
        {plan.caracteristicas.map((c) => (
          <li key={c} className="flex gap-2.5 text-sm">
            {/* El ✓ va `aria-hidden`: un lector leería «marca de verificación»
                delante de cada línea, que no aporta nada. */}
            <span
              aria-hidden="true"
              className={destacado ? "text-dorado-light" : "text-dorado"}
            >
              ✓
            </span>
            <span className={destacado ? "text-beige/85" : "text-verde-700"}>
              {c}
            </span>
          </li>
        ))}
      </ul>

      {/* Lo que de verdad interesa en un panel interno: no «contrátalo», sino
          cuánta gente lo tiene y cuánto deja. */}
      <dl
        className={`mt-6 grid grid-cols-2 gap-3 border-t pt-4 text-sm ${
          destacado ? "border-verde-700" : "border-beige"
        }`}
      >
        <div>
          <dt className={destacado ? "text-beige/70" : "text-verde-300"}>
            Clientes
          </dt>
          <dd
            className={`tabular-nums ${destacado ? "text-arena" : "text-verde"}`}
          >
            {numero(plan.clientes)}
          </dd>
        </div>
        <div>
          <dt className={destacado ? "text-beige/70" : "text-verde-300"}>
            {/* Corto en pantalla porque con cuatro tarjetas la columna mide
                ~100px y la versión larga se partía en dos líneas. El lector
                de pantalla oye la frase entera. */}
            <span aria-hidden="true" className="whitespace-nowrap">
              Cobrado 30 d
            </span>
            <span className="sr-only">Cobrado en los últimos 30 días</span>
          </dt>
          <dd
            className={`tabular-nums ${destacado ? "text-arena" : "text-verde"}`}
          >
            {/* «—» y no «$0» cuando el rol no puede ver pagos: ver
                `PlanConMetricas.cobrado30d`. */}
            {plan.cobrado30d === null ? "—" : moneda(plan.cobrado30d)}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
