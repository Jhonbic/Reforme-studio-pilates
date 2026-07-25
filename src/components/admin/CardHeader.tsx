import type { ReactNode } from "react";
import type { TonoCard } from "./Card";

type Props = {
  titulo: string;
  descripcion?: string;
  /** Slot a la derecha del título: badges, enlaces "Ver todo →"… */
  accion?: ReactNode;
  tono?: TonoCard;
};

/**
 * Cabecera de tarjeta.
 *
 * Emite `<h2>` porque en el dashboard las tarjetas son los bloques de primer
 * nivel de la página: no hay títulos de sección por encima de ellas.
 */
export default function CardHeader({
  titulo,
  descripcion,
  accion,
  tono = "claro",
}: Props) {
  const oscuro = tono === "oscuro";

  return (
    <header
      className={
        accion
          ? "flex flex-wrap items-start justify-between gap-3"
          : undefined
      }
    >
      <div className={accion ? "min-w-0" : undefined}>
        <h2
          className={`font-display text-xl ${oscuro ? "text-arena" : "text-verde"}`}
        >
          {titulo}
        </h2>
        {descripcion && (
          <p
            className={`mt-1 text-sm leading-relaxed ${
              oscuro ? "text-beige/75" : "text-verde-300"
            }`}
          >
            {descripcion}
          </p>
        )}
      </div>
      {accion}
    </header>
  );
}
