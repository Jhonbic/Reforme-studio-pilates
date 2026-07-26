import type { ReactNode } from "react";
import Card from "@/components/admin/Card";

/**
 * Un bloque del formulario.
 *
 * Una `Card` por sección en vez de una sola tarjeta con separadores, porque
 * `Card` ya enciende el borde en dorado con `focus-within`: **la sección que se
 * está editando se resalta sola**, gratis y en el idioma de la marca.
 *
 * ⚠️ La rejilla es de 2 columnas pero **casi todos los campos ocupan las dos**
 * (`ancho`). Un formulario a dos columnas de verdad rompe el recorrido vertical:
 * al terminar el campo 1 el ojo no sabe si sigue por el 2 (derecha) o el 3
 * (abajo). Solo se emparejan los campos que son un mismo dato —tipo y número de
 * documento— o que se leen juntos.
 */
export default function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <fieldset>
        <legend className="eyebrow mb-4 text-dorado-dark">{titulo}</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
      </fieldset>
    </Card>
  );
}
