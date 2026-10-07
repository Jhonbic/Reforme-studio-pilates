import Link from "next/link";

const PESTANAS = [
  { href: "/admin/clases", label: "Agenda" },
  { href: "/admin/clases/horario", label: "Horario semanal" },
] as const;

/**
 * Agenda · Horario semanal: las dos caras de Clases, una al lado de la otra.
 *
 * Antes el horario era una subpágina con un botón escondido en la agenda, y no
 * se entendía que la agenda SALE del horario (feedback del usuario: «no es muy
 * intuitivo»). Mismo aspecto que las pestañas Clientes · Equipo de Usuarios.
 *
 * ⚠️ Son ENLACES, no `role="tab"`: cada una es una ruta. Un `tablist` promete
 * cambiar de panel sin salir de la página y moverse con las flechas; aquí se
 * navega, y eso se anuncia con `aria-current="page"`.
 */
export default function PestanasClases({ actual }: { actual: "/admin/clases" | "/admin/clases/horario" }) {
  return (
    <nav aria-label="Clases" className="flex gap-2">
      {PESTANAS.map((p) => {
        const activa = p.href === actual;
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={activa ? "page" : undefined}
            className={`control-fx relative inline-flex min-h-[44px] items-center overflow-hidden rounded-full border px-5 text-sm font-bold transition-[color,background-color,border-color,box-shadow] duration-300 ${
              activa
                ? "border-dorado bg-dorado text-verde-900"
                : "border-beige text-verde-700 hover:border-dorado hover:text-verde hover:ring-2 hover:ring-dorado/25 focus-visible:border-dorado focus-visible:ring-2 focus-visible:ring-dorado/25"
            }`}
          >
            {!activa && <span className="control-sheen control-sheen--lento" aria-hidden="true" />}
            {p.label}
          </Link>
        );
      })}
    </nav>
  );
}
