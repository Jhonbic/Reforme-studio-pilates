import Link from "next/link";
import Avatar from "./Avatar";
import EstadoBadge from "./EstadoBadge";
import { documento, fecha, moneda } from "@/lib/admin/format";
import { REJILLA_CLIENTE } from "./rejilla";
import type { Cliente } from "@/lib/admin/types";

/**
 * Una fila del listado de clientes.
 *
 * **La fila entera es el enlace a la ficha**, no un botón dentro de la fila:
 * evita interactivos anidados (que rompen la tabulación y confunden a los
 * lectores de pantalla) y da un objetivo táctil enorme en móvil.
 *
 * ⚠️ **Un solo DOM para móvil y escritorio.** El truco es el `md:contents` del
 * envoltorio: en móvil es una caja flex que agrupa los datos bajo el nombre; en
 * escritorio desaparece de la maquetación y sus cuatro hijos pasan a ser
 * columnas de la propia rejilla de la fila. Duplicar el marcado con
 * `hidden`/`md:block` habría duplicado también el contenido que anuncia un
 * lector de pantalla.
 */
export default function FilaCliente({ cliente }: { cliente: Cliente }) {
  return (
    <Link
      href={`/admin/usuarios/${cliente.id}`}
      className={`${REJILLA_CLIENTE} min-h-[76px] gap-y-1 py-3 transition-colors duration-200 hover:bg-arena/70`}
    >
      <Avatar nombre={cliente.nombre} />

      <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 md:contents">
        <span className="min-w-0 basis-full md:basis-auto">
          <span className="block truncate font-display text-lg leading-tight text-verde">
            {cliente.nombre}
          </span>
          {/* La cédula y no el correo: es el campo por el que se busca, y un
              resultado de búsqueda que no muestra lo que buscaste no se puede
              verificar de un vistazo. El correo vive en la ficha. */}
          <span className="block truncate text-xs tabular-nums text-verde-300">
            C.C. {documento(cliente.identificacion)}
          </span>
        </span>

        <span className="min-w-0 text-sm text-verde-700">
          <span className="block truncate">{cliente.plan}</span>
          <span className="block text-xs tabular-nums text-verde-300">
            {moneda(cliente.importeRenovacion)}
          </span>
        </span>

        <EstadoBadge estado={cliente.estado} />

        {/* Sin ancho propio: el de la columna lo fija `REJILLA_CLIENTE`, para
            que cuadre con el rótulo de la cabecera. */}
        <span className="whitespace-nowrap text-sm tabular-nums text-verde-300 md:text-right">
          {/* `sr-only` y no `hidden`: en escritorio la columna ya dice qué es
              por su posición, pero un lector de pantalla no ve columnas y leería
              una fecha suelta. `sr-only` es absoluto, así que no ocupa. */}
          <span className="md:sr-only">Vence </span>
          {fecha(cliente.vencimiento)}
        </span>
      </span>

      <span aria-hidden="true" className="text-xl leading-none text-verde-300">
        ›
      </span>
    </Link>
  );
}
