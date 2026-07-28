import Pastilla, { TONO_ESTADO } from "@/components/admin/Pastilla";
import type { EstadoClase } from "@/lib/admin/types";

/**
 * Estado de una clase, con el mismo vocabulario de símbolos que los estados de
 * membresía (`● ▲ ■ ○`): quien ya sabe leer el listado de Usuarios no tiene que
 * aprender otro idioma aquí.
 *
 * ⚠️ **La agenda solo pinta dos de los cuatro**, `Cancelada` y `Finalizada`
 * (ver `FilaClase`): «Programada» es lo normal y una pastilla que sale en todas
 * las filas no distingue ninguna, y «Llena» ya lo dice el cupo de al lado con
 * todas las letras. El mapa se queda completo porque `Record<EstadoClase, …>`
 * obliga —y porque quitar entradas invitaría a pintar un estado sin color el
 * día que alguien reutilice esto en otra pantalla.
 *
 * - `Cancelada` rojo — hay gente a la que avisar.
 * - `Finalizada` neutro — ya pasó, no hay nada que hacer. Misma tinta que
 *   «Inactiva» en clientes, por la misma razón: no es una alarma.
 */
const ESTILOS: Record<EstadoClase, { simbolo: string; clase: string }> = {
  Programada: { simbolo: "●", clase: TONO_ESTADO.ok },
  Llena: { simbolo: "▲", clase: TONO_ESTADO.aviso },
  Cancelada: { simbolo: "■", clase: TONO_ESTADO.grave },
  Finalizada: { simbolo: "○", clase: TONO_ESTADO.neutro },
};

export default function EstadoClaseBadge({ estado }: { estado: EstadoClase }) {
  const { simbolo, clase } = ESTILOS[estado];
  return <Pastilla simbolo={simbolo} texto={estado} clase={clase} />;
}
