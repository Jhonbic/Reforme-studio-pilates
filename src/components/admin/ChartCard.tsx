import type { ReactNode } from "react";
import Card, { type TonoCard } from "./Card";
import CardHeader from "./CardHeader";
import TablaDeDatos, { type TablaDatos } from "./TablaDeDatos";

// El tipo vivía aquí antes de extraer la tabla a su propio componente. Se
// re-exporta para no romper los imports existentes.
export type { TablaDatos };

type ChartCardProps = {
  titulo: string;
  descripcion?: string;
  children: ReactNode;
  /** Vista de tabla del mismo dato. Obligatoria: ver `TablaDeDatos`. */
  tabla: TablaDatos;
  /** Slot a la derecha del título (badges, enlaces). */
  accion?: ReactNode;
  tono?: TonoCard;
  className?: string;
};

/**
 * Marco común de todos los gráficos del panel: título, descripción, el gráfico
 * y un desplegable con los datos en tabla.
 */
export default function ChartCard({
  titulo,
  descripcion,
  children,
  tabla,
  accion,
  tono = "claro",
  className = "",
}: ChartCardProps) {
  return (
    <Card tono={tono} className={`flex flex-col ${className}`}>
      <CardHeader
        titulo={titulo}
        descripcion={descripcion}
        accion={accion}
        tono={tono}
      />
      <div className="mt-5 flex-1">{children}</div>
      <TablaDeDatos tabla={tabla} tono={tono} />
    </Card>
  );
}
