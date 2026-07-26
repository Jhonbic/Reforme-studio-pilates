"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Props = {
  /** Contenido del botón que abre el panel (texto, icono, avatar…). */
  etiqueta: ReactNode;
  children: ReactNode;
  /** Obligatorio si `etiqueta` es solo un icono. */
  ariaLabel?: string;
  alineacion?: "izquierda" | "derecha";
  claseBoton?: string;
  clasePanel?: string;
};

/**
 * Panel desplegable del panel administrativo.
 *
 * Recoge las reglas que `MenuExportar` ya había resuelto a mano —cierre al
 * pulsar fuera, cierre con `Escape` devolviendo el foco al botón— para no
 * volver a escribirlas en cada menú nuevo.
 *
 * ⚠️ **No usa `role="menu"` / `role="menuitem"` a propósito.** Ese rol promete
 * a un lector de pantalla navegación con las flechas y salto por inicial, y
 * anuncia el número de elementos; declararlo sin implementarlo deja al usuario
 * pulsando flechas que no hacen nada. Como aquí dentro puede ir cualquier cosa
 * (enlaces, casillas, una lista de avisos), se queda como una región normal:
 * el contenido va justo después del botón en el DOM, así que se recorre con el
 * tabulador sin sorpresas.
 *
 * ⚠️ El disparador lo **renderiza este componente**, no se recibe hecho para
 * clonarlo: clonar obliga a inyectar `ref` y `onClick` por encima de los que
 * trajera el elemento, y los pisa en silencio.
 */
export default function Dropdown({
  etiqueta,
  children,
  ariaLabel,
  alineacion = "izquierda",
  claseBoton = "",
  clasePanel = "",
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const botonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const cerrarYDevolverFoco = useCallback(() => {
    setAbierto(false);
    botonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!abierto) return;

    const alPulsarTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cerrarYDevolverFoco();
      }
    };

    /* `pointerdown` y no `click`: con `click` el panel seguiría abierto durante
       todo el gesto y, al soltar sobre algo de detrás, ese algo recibiría la
       pulsación con el menú aún encima. Mismo criterio que `MenuExportar`.

       Aquí se cierra SIN devolver el foco: la persona ya está pulsando en otro
       sitio, y robarle el foco al botón le quitaría el clic que iba a dar. */
    const alPulsarFuera = (e: PointerEvent) => {
      const destino = e.target as Node;
      if (
        !botonRef.current?.contains(destino) &&
        !panelRef.current?.contains(destino)
      ) {
        setAbierto(false);
      }
    };

    document.addEventListener("keydown", alPulsarTecla);
    document.addEventListener("pointerdown", alPulsarFuera);
    return () => {
      document.removeEventListener("keydown", alPulsarTecla);
      document.removeEventListener("pointerdown", alPulsarFuera);
    };
  }, [abierto, cerrarYDevolverFoco]);

  return (
    <div className="relative">
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-haspopup="true"
        aria-label={ariaLabel}
        className={claseBoton}
      >
        {etiqueta}
      </button>

      {abierto && (
        <div
          ref={panelRef}
          className={`absolute top-full z-40 mt-2 min-w-52 overflow-hidden rounded-2xl border border-beige bg-white py-1 shadow-lift ${
            alineacion === "derecha" ? "right-0" : "left-0"
          } ${clasePanel}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Opción pulsable del desplegable.
 *
 * Deshabilitar de verdad (`disabled`) y no con `aria-disabled` porque aquí no
 * hay ningún porqué que leer: a diferencia del «Nuevo cliente» del listado,
 * una opción apagada de un menú no lleva explicación adosada, así que sacarla
 * del orden de tabulación no esconde información.
 */
export function DropdownItem({
  children,
  onClick,
  deshabilitado = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  deshabilitado?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      className={`flex min-h-[44px] w-full items-center gap-2 px-4 text-left text-sm transition-colors duration-300 ${
        deshabilitado
          ? "cursor-not-allowed text-verde-300"
          : "text-verde-700 hover:bg-arena focus-visible:bg-arena"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function DropdownDivider() {
  return <div className="my-1 border-t border-beige" role="separator" />;
}
