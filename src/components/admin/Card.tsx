import type { ReactNode } from "react";
import HeroFX from "@/components/fx/HeroFX";

export type TonoCard = "claro" | "oscuro" | "acento";

type Props = {
  /**
   * `oscuro` no es decoración: es lo que da ritmo al panel. Con todas las
   * tarjetas blancas, todo pesa igual y la página se lee como un informe.
   * Úsalo con cuentagotas — dos o tres por pantalla como mucho.
   */
  tono?: TonoCard;
  /**
   * `plana` quita el relleno para que listas y tablas lleguen a los bordes
   * (las líneas divisorias cruzan la tarjeta entera, en vez de quedarse
   * flotando dentro). Con ella, el relleno lo pone cada bloque de dentro.
   */
  densidad?: "normal" | "compacta" | "plana";
  /**
   * Capa de motas doradas y estela de la web pública (`HeroFX`), **sin el
   * goteo al clic**: en el panel casi todo clic va a un control, y una onda
   * decorativa encima confunde sobre si la acción se registró.
   *
   * Solo para tarjetas `oscuro`: sobre fondo claro el dorado no se ve, y en las
   * tarjetas de datos competiría con el hover de los gráficos. El canvas es
   * `pointer-events-none`, así que nunca bloquea nada, y se apaga solo con
   * `prefers-reduced-motion`.
   */
  fx?: boolean;
  /**
   * Estela diagonal dorada al pasar el ratón (`.card-sheen`, la misma de la web
   * pública). Necesita recortar con `overflow-hidden`, así que NO vale en
   * tarjetas con tooltip o contenido que se salga del marco.
   */
  sheen?: boolean;
  /**
   * Encender el borde en dorado al `hover` / `focus-within`. Se apaga en las
   * tarjetas GRANDES que ocupan casi toda la pantalla —el listado de Usuarios—:
   * ahí no hay nada que señalar (el cursor está siempre dentro) y un marco
   * dorado de 1400px pasa de acento a caja de regalo.
   */
  resalte?: boolean;
  as?: "section" | "div" | "article";
  className?: string;
  id?: string;
  children: ReactNode;
};

const TONOS: Record<TonoCard, string> = {
  claro: "border-beige bg-white",
  // `bg-verde` (#284435) es EL verde de marca. Antes esto usaba `verde-900`
  // (#1b2f24), que es la escala de profundidad para hovers y sombras, no un
  // color de superficie: se veía casi negro y desentonaba con el resto.
  oscuro: "border-verde-700 bg-verde text-arena",
  acento: "border-dashed border-dorado/50 bg-dorado/5 text-verde-700",
};

/**
 * Marco visual común de todo el panel. Antes este mismo puñado de clases estaba
 * copiado a mano en cinco sitios; cualquier variante nueva había que copiarla
 * otras cinco veces.
 */
export default function Card({
  tono = "claro",
  densidad = "normal",
  as: Etiqueta = "section",
  className = "",
  id,
  fx = false,
  sheen = false,
  resalte: conResalte = true,
  children,
}: Props) {
  const relleno =
    densidad === "plana"
      ? "overflow-hidden"
      : densidad === "compacta"
        ? "p-4 sm:p-5"
        : "p-5 sm:p-6";

  /* `isolate` + `-z-10` en el canvas es lo que lo deja DETRÁS del texto sin
     tener que envolver los hijos en un div: dentro de un contexto de apilado se
     pinta primero el fondo de la tarjeta, luego los hijos con z negativo, y
     encima el contenido en flujo. Envolver los hijos rompería los `flex-col`,
     `mt-auto` y `self-start` que las tarjetas aplican desde fuera.
     `overflow-hidden` recorta el canvas a las esquinas redondeadas. */
  const capaFx = fx ? "relative isolate overflow-hidden" : "";
  const capaSheen = sheen ? "group relative overflow-hidden" : "";

  /* El borde se enciende en dorado al pasar el ratón y también con
     `focus-within`, para que quien navegue con teclado reciba la misma señal al
     entrar en una tarjeta con enlaces dentro.

     ⚠️ El grosor extra lo pone un `ring`, NO un `border-2`: cambiar el ancho
     del borde en hover desplazaría 1px todo el contenido de la tarjeta y se
     vería como un temblor al pasar por encima. El `ring` es una sombra, no
     ocupa espacio. Por eso la transición incluye `box-shadow`. */
  const resalte = conResalte
    ? "transition-[border-color,box-shadow] duration-300 hover:border-dorado hover:ring-2 hover:ring-dorado/45 focus-within:border-dorado focus-within:ring-2 focus-within:ring-dorado/45"
    : "";

  return (
    <Etiqueta
      id={id}
      className={`rounded-2xl border shadow-card ${TONOS[tono]} ${relleno} ${resalte} ${capaFx} ${capaSheen} ${className}`}
    >
      {fx && <HeroFX className="-z-10" goteo={false} />}
      {sheen && <span className="card-sheen" aria-hidden="true" />}
      {children}
    </Etiqueta>
  );
}
