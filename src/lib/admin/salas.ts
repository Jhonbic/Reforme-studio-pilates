import type { SalaId, TipoClase } from "./types";

/**
 * La sala en la que se da una clase. Misma regla que el trigger
 * `clases_sala_y_aforo` de la base, que es quien manda: Reformer y Mat van
 * SIEMPRE en la suya; la privada, en la que se elija.
 */
export function salaDeClase(tipo: TipoClase, elegida: SalaId): SalaId {
  return tipo === "Privada" ? elegida : tipo;
}
