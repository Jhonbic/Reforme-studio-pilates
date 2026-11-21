"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { contarActividadSinVer } from "@/lib/admin/acciones";

/** Cada cuánto pregunta la campana. Un minuto: es un estudio, no una bolsa. */
const CADA_MS = 60_000;

type Actividad = {
  sinVer: number;
  /** Vuelve a preguntar ya, sin esperar al minuto. */
  refrescar: () => void;
};

const ActividadContext = createContext<Actividad>({ sinVer: 0, refrescar: () => {} });

/**
 * Cuántos movimientos de reservas no ha visto quien mira el panel: la campana
 * de la barra lateral y el punto del ☰ en el móvil leen de aquí.
 *
 * ⚠️ **Pregunta cada minuto, sin servicios externos** (decisión del usuario:
 * «en la web, sin meternos con servicios externos»). Se podría escuchar a la
 * base en vivo (Supabase Realtime), pero un minuto de retraso no cambia nada
 * en recepción y así no hay conexión abierta que vigilar.
 * - Con la pestaña oculta no pregunta; al volver a ella, sí.
 * - Al cambiar de página también.
 * - ⚠️ «Actividad» llama a `refrescar()` al montarse. Con `loading.tsx`, la
 *   ruta cambia (y se pregunta) ANTES de que el servidor marque lo visto, así
 *   que la campana se quedaba en el número viejo hasta el minuto siguiente.
 * - El primer número llega del layout (servidor): sin parpadeo al cargar.
 */
export function ActividadProvider({ inicial, children }: { inicial: number; children: ReactNode }) {
  const [sinVer, setSinVer] = useState(inicial);
  const pathname = usePathname();
  const primera = useRef(true);
  // El número de la última pregunta: si dos se cruzan, gana la más reciente.
  const turno = useRef(0);

  const refrescar = useCallback(() => {
    if (document.visibilityState !== "visible") return;
    const mio = ++turno.current;
    contarActividadSinVer()
      .then((n) => {
        if (mio === turno.current) setSinVer(n);
      })
      // Sin red no pasa nada: el siguiente minuto vuelve a intentarlo.
      .catch(() => {});
  }, []);

  useEffect(() => {
    const preguntar = refrescar;

    // Al montar ya está el número del servidor; después de cada navegación, no.
    if (primera.current) primera.current = false;
    else preguntar();

    const intervalo = window.setInterval(preguntar, CADA_MS);
    document.addEventListener("visibilitychange", preguntar);
    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", preguntar);
    };
  }, [pathname, refrescar]);

  const valor = useMemo(() => ({ sinVer, refrescar }), [sinVer, refrescar]);
  return <ActividadContext.Provider value={valor}>{children}</ActividadContext.Provider>;
}

export function useActividad(): Actividad {
  return useContext(ActividadContext);
}

/** «3» o «99+»: el número de la campana. */
export function numeroCampana(n: number): string {
  return n > 99 ? "99+" : String(n);
}
