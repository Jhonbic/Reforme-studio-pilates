import Link from "next/link";
import Avatar from "@/components/admin/usuarios/Avatar";
import { fecha, moneda } from "@/lib/admin/format";
import type { MetodoPago, Pago } from "@/lib/admin/types";

/* Cada método con su símbolo, misma doctrina que `EstadoBadge` y `Variacion`:
   nunca se codifica solo con color. Aquí ni siquiera hace falta color — el
   método es una categoría, no un estado, y pintarlo de colores competiría con
   las series de los gráficos de al lado. */
const SIMBOLO: Record<MetodoPago, string> = {
  Nequi: "◈",
  Transferencia: "⇄",
  Efectivo: "●",
  Tarjeta: "▭",
};

/**
 * Las últimas entradas del libro de pagos.
 *
 * Cada fila **enlaza a la ficha del cliente**, no a un detalle del pago: el
 * pago no tiene más que lo que ya se ve, mientras que lo que se quiere hacer
 * tras leerlo es mirar a quién se lo cobramos. Misma decisión que la fila del
 * listado de Usuarios.
 */
export default function UltimosPagos({ pagos }: { pagos: Pago[] }) {
  return (
    <ul className="divide-y divide-beige border-t border-beige">
      {pagos.map((p) => (
        <li key={p.id}>
          <Link
            href={`/admin/usuarios/${p.clienteId}`}
            className="flex min-h-[64px] items-center gap-3 px-5 py-3 transition-colors duration-200 hover:bg-arena/70 sm:px-6"
          >
            <Avatar nombre={p.cliente} />

            <span className="min-w-0 flex-1">
              <span className="block truncate text-verde">{p.cliente}</span>
              <span className="block truncate text-xs text-verde-300">
                {p.plan}
                {" · "}
                <span aria-hidden="true">{SIMBOLO[p.metodo]} </span>
                {p.metodo}
              </span>
            </span>

            <span className="shrink-0 text-right">
              <span className="block tabular-nums text-verde-700">
                {moneda(p.importe)}
              </span>
              <span className="block text-xs tabular-nums text-verde-300">
                {fecha(p.fecha)}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
