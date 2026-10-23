type Props = {
  visible: boolean;
  onToggle: () => void;
  /** Id del campo que muestra u oculta (`aria-controls`). */
  campo: string;
};

/**
 * El ojo para mostrar u ocultar la contraseña, dentro del campo (va en el
 * `accesorio` de `TextField`).
 *
 * El icono enseña lo que PASARÁ al pulsar, como en iOS y Android: ojo abierto
 * con la contraseña oculta, ojo tachado con ella visible. Al no haber texto, el
 * nombre accesible lo pone `aria-label`, y cambia con el estado para que el
 * lector diga qué hace el botón ahora.
 *
 * 44px de objetivo táctil aunque el icono mida 20: es el mínimo del proyecto.
 */
export default function BotonVerContrasena({ visible, onToggle, campo }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-controls={campo}
      aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      className="flex h-11 w-11 items-center justify-center rounded-lg text-verde-300 transition-colors duration-300 hover:text-dorado-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dorado/60"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
        <circle cx="12" cy="12" r="3" />
        {visible && <path d="M4 4l16 16" />}
      </svg>
    </button>
  );
}
