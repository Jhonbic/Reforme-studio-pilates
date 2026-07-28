import Pastilla, { TONO_ESTADO } from "@/components/admin/Pastilla";
import type { EstadoMembresia } from "@/lib/admin/types";

/* `Pastilla` se re-exporta porque `FilaMiembro` la usa desde aquí desde antes de
   que existiera `admin/Pastilla.tsx`, y su sitio natural sigue siendo este
   módulo: quien pinta estados de cliente entra por este archivo. */
export { default as Pastilla } from "@/components/admin/Pastilla";

/**
 * Los cuatro estados de membresía.
 *
 * `Inactiva` va en neutro a propósito: no es una alarma, es alguien que dejó de
 * venir.
 */
const ESTILOS: Record<EstadoMembresia, { simbolo: string; clase: string }> = {
  Activa: { simbolo: "●", clase: TONO_ESTADO.ok },
  "Por vencer": { simbolo: "▲", clase: TONO_ESTADO.aviso },
  Vencida: { simbolo: "■", clase: TONO_ESTADO.grave },
  Inactiva: { simbolo: "○", clase: TONO_ESTADO.neutro },
};

export default function EstadoBadge({ estado }: { estado: EstadoMembresia }) {
  const { simbolo, clase } = ESTILOS[estado];
  return <Pastilla simbolo={simbolo} texto={estado} clase={clase} />;
}
