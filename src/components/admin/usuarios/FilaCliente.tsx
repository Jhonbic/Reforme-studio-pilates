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
          <span className="block truncate text-base font-bold leading-tight text-verde">
            {cliente.nombre}
          </span>
          {/* Escritorio: la cédula, que es el campo por el que se busca (un
              resultado que no muestra lo que buscaste no se verifica de un
              vistazo). Móvil: el contacto (decisión del usuario: en el móvil,
              solo nombre, contacto y estado). `hidden` y no `sr-only`: así
              cada tamaño anuncia solo lo que enseña. */}
          <span className="hidden truncate text-xs tabular-nums text-verde-300 md:block">
            {cliente.tipoIdentificacion ?? "C.C."}{" "}
            {documento(cliente.identificacion)}
          </span>
          <span className="block truncate text-xs tabular-nums text-verde-300 md:hidden">
            {cliente.telefono || cliente.correo || "Sin contacto"}
          </span>
        </span>

        {/* Plan y vencimiento, solo en escritorio: en el móvil se amontonaba
            todo (están en la ficha). */}
        <span className="hidden min-w-0 text-sm text-verde-700 md:block">
          {/* Sin plan no hay ni plan ni importe: una raya, no «$0», que se
              leería como «renueva gratis». */}
          <span className="block truncate">{cliente.plan || "—"}</span>
          <span className="block text-xs tabular-nums text-verde-300">
            {cliente.plan ? moneda(cliente.importeRenovacion) : "Por asignar"}
          </span>
        </span>

        <EstadoBadge estado={cliente.estado} />

        {/* Sin ancho propio: el de la columna lo fija `REJILLA_CLIENTE`, para
            que cuadre con el rótulo de la cabecera. */}
        <span className="hidden whitespace-nowrap text-sm tabular-nums text-verde-300 md:block md:text-right">
          {/* `sr-only` y no `hidden`: en escritorio la columna ya dice qué es
              por su posición, pero un lector de pantalla no ve columnas y leería
              una fecha suelta. `sr-only` es absoluto, así que no ocupa. */}
          <span className="md:sr-only">Vence </span>
          {cliente.vencimiento ? fecha(cliente.vencimiento) : "—"}
        </span>
      </span>

      <span aria-hidden="true" className="text-xl leading-none text-verde-300">
        ›
      </span>
    </Link>
  );
}
