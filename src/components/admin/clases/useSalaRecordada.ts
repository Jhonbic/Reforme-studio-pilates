"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { SalaId } from "@/lib/admin/types";

export const TODAS_LAS_SALAS = "Todas";
export type FiltroSala = typeof TODAS_LAS_SALAS | SalaId;

const CLAVE = "reforme.agenda.sala";
const EVENTO = "reforme:agenda-sala";

/* Respaldo en memoria para cuando `localStorage` no deja leer ni escribir
   (modo privado, datos bloqueados): la elección dura lo que la página
   abierta, que es lo mínimo esperable de un filtro. */
let enMemoria: string | null = null;

/* Referencias estables para `useSyncExternalStore`: si se crearan en cada
   render, volvería a suscribirse sin parar. */
function suscribir(alCambiar: () => void) {
  window.addEventListener(EVENTO, alCambiar);
  // Otra pestaña del mismo navegador cambió la sala.
  window.addEventListener("storage", alCambiar);
  return () => {
    window.removeEventListener(EVENTO, alCambiar);
    window.removeEventListener("storage", alCambiar);
  };
}

function leer(): string {
  try {
    return window.localStorage.getItem(CLAVE) ?? enMemoria ?? TODAS_LAS_SALAS;
  } catch {
    return enMemoria ?? TODAS_LAS_SALAS;
  }
}

const enServidor = () => TODAS_LAS_SALAS;

/**
 * La sala elegida en la agenda, **recordada en este dispositivo** (decisión
 * del usuario): quien solo programa Reformer no tiene que filtrar cada vez.
 *
 * `localStorage` y no la base: es una comodidad de quien mira, no un dato del
 * estudio, y en otro móvil cada uno tendrá la suya.
 *
 * ⚠️ `useSyncExternalStore` y no `useState` con el valor guardado: el panel se
 * pinta en el servidor, que no tiene `localStorage`. Leerlo en el estado
 * inicial daría un HTML distinto en servidor y cliente (error de hidratación).
 * Así el servidor y el primer render dicen «Todas», y justo después la
 * guardada. Mismo montaje que `useEsEscritorio` en `SidebarContext`.
 *
 * Un valor guardado que ya no es una sala (se renombró o se quitó) cuenta
 * como «Todas».
 */
export function useSalaRecordada(salas: SalaId[]): [FiltroSala, (s: FiltroSala) => void] {
  const guardada = useSyncExternalStore(suscribir, leer, enServidor);
  const sala: FiltroSala = (salas as string[]).includes(guardada)
    ? (guardada as SalaId)
    : TODAS_LAS_SALAS;

  const elegir = useCallback((s: FiltroSala) => {
    enMemoria = s;
    try {
      window.localStorage.setItem(CLAVE, s);
    } catch {
      // Sin almacenamiento: vale con la memoria.
    }
    window.dispatchEvent(new Event(EVENTO));
  }, []);

  return [sala, elegir];
}
