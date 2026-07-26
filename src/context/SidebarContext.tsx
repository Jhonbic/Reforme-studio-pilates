"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/** El mismo 1024px que el breakpoint `lg` de Tailwind, que es donde la barra
 *  pasa de superponerse (móvil) a ocupar su propia columna (escritorio). */
const CONSULTA_ESCRITORIO = "(min-width: 1024px)";

function suscribirEscritorio(alCambiar: () => void) {
  const mq = window.matchMedia(CONSULTA_ESCRITORIO);
  mq.addEventListener("change", alCambiar);
  return () => mq.removeEventListener("change", alCambiar);
}

/**
 * ⚠️ `useSyncExternalStore` y no `useState` + `useEffect`: el lint de React 19
 * prohíbe `setState` dentro de un efecto. En el servidor devuelve `false`
 * (móvil primero, que es el dispositivo principal del proyecto).
 */
function useEsEscritorio() {
  return useSyncExternalStore(
    suscribirEscritorio,
    () => window.matchMedia(CONSULTA_ESCRITORIO).matches,
    () => false,
  );
}

type SidebarContextType = {
  /** Barra desplegada en ESCRITORIO. */
  isExpanded: boolean;
  /** Cajón abierto en MÓVIL. */
  isMobileOpen: boolean;
  /**
   * Si la navegación se está viendo ahora mismo, ya sea por una vía o la otra.
   * Es lo que debe leer un `aria-expanded`: son dos estados distintos, pero
   * para quien mira la pantalla solo hay uno.
   */
  visible: boolean;
  /** Alterna el estado que corresponde al viewport actual. */
  toggleSidebar: () => void;
  closeMobileSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const esEscritorio = useEsEscritorio();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  /* Un solo botón para las dos cosas: en escritorio pliega la columna, en móvil
     abre el cajón. Antes esto se decidía leyendo `window.innerWidth` dentro del
     manejador del header, que es el mismo dato pero sin suscripción: al girar
     el móvil o redimensionar, nada se enteraba. */
  const toggleSidebar = useCallback(() => {
    if (esEscritorio) setIsExpanded((v) => !v);
    else setIsMobileOpen((v) => !v);
  }, [esEscritorio]);

  const closeMobileSidebar = useCallback(() => setIsMobileOpen(false), []);

  return (
    <SidebarContext.Provider
      value={{
        isExpanded,
        isMobileOpen,
        visible: esEscritorio ? isExpanded : isMobileOpen,
        toggleSidebar,
        closeMobileSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar debe usarse dentro de SidebarProvider");
  return ctx;
}
