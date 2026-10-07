import type { ClaseEnAgenda, ReservaEnClase } from "./types";

/**
 * Asistencia (oct 2026): de cada reserva se marca «Asistió» o «No vino» una
 * vez empieza la clase.
 *
 * Un solo sitio para las dos preguntas que se hacen la fila de la agenda y el
 * diálogo de reservas: si se hicieran en cada componente, la fila podría
 * avisar «3 sin marcar» de una clase que el diálogo no deja marcar.
 *
 * ⚠️ Es una pista para la PANTALLA. Quien decide de verdad es la base
 * (`marcar_asistencia`), con las mismas reglas.
 */

/**
 * Quién puede marcar: el mostrador (Administración y Recepción) y la
 * instructora DE ESA CLASE. Solo una vez empezada y si no se canceló.
 */
export function puedeMarcarAsistencia(
  clase: ClaseEnAgenda,
  esMostrador: boolean,
  miEquipoId: string | null,
): boolean {
  if (clase.estado === "Cancelada" || !clase.empezada) return false;
  return esMostrador || (miEquipoId !== null && clase.instructoraId === miEquipoId);
}

export type ResumenAsistencia = { asistio: number; noVino: number; sinMarcar: number };

export function resumenAsistencia(reservados: ReservaEnClase[]): ResumenAsistencia {
  const r = { asistio: 0, noVino: 0, sinMarcar: 0 };
  for (const x of reservados) {
    if (x.asistencia === "Asistió") r.asistio++;
    else if (x.asistencia === "No vino") r.noVino++;
    else r.sinMarcar++;
  }
  return r;
}
