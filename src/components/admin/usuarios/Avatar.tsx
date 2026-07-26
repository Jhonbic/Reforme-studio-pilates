import { iniciales } from "@/lib/admin/format";

/**
 * Círculo de iniciales. No es decoración: en una lista de filas altas es el
 * ancla visual que permite recorrer la columna de nombres de un vistazo, y
 * ocupa el sitio donde algún día irá la foto del cliente.
 *
 * `aria-hidden` porque el nombre completo va justo al lado: leerlo dos veces
 * (una deletreada) solo estorba a quien usa lector de pantalla.
 */
export default function Avatar({ nombre }: { nombre: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-dorado/15 font-display text-base text-dorado-dark"
    >
      {iniciales(nombre)}
    </span>
  );
}
