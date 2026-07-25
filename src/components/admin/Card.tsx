import type { ReactNode } from "react";

export type TonoCard = "claro" | "oscuro" | "acento";

type Props = {
  /**
   * `oscuro` no es decoración: es lo que da ritmo al panel. Con todas las
   * tarjetas blancas, todo pesa igual y la página se lee como un informe.
   * Úsalo con cuentagotas — dos o tres por pantalla como mucho.
   */
  tono?: TonoCard;
  densidad?: "normal" | "compacta";
  as?: "section" | "div" | "article";
  className?: string;
  id?: string;
  children: ReactNode;
};

const TONOS: Record<TonoCard, string> = {
  claro: "border-beige bg-white",
  oscuro: "border-verde-700 bg-verde-900 text-arena",
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
  children,
}: Props) {
  const relleno = densidad === "compacta" ? "p-4 sm:p-5" : "p-5 sm:p-6";

  return (
    <Etiqueta
      id={id}
      className={`rounded-2xl border shadow-soft ${TONOS[tono]} ${relleno} ${className}`}
    >
      {children}
    </Etiqueta>
  );
}
