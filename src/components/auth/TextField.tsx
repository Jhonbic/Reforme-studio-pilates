import type { ComponentProps, ReactNode } from "react";

type TextFieldProps = ComponentProps<"input"> & {
  label: string;
  id: string;
  hint?: ReactNode;
  /** Control pegado al borde derecho DENTRO del campo (p. ej. el ojo de la
   *  contraseña). El input reserva su hueco con `pr-12` para que el texto no
   *  se meta por debajo. */
  accesorio?: ReactNode;
  error?: string;
};

/** Campo de texto con etiqueta, estética de marca y estado de error. */
export default function TextField({
  label,
  id,
  hint,
  accesorio,
  error,
  className = "",
  ...props
}: TextFieldProps) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label
          htmlFor={id}
          className="text-sm font-medium tracking-wide text-verde"
        >
          {label}
        </label>
        {hint}
      </div>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          /* El color del anillo va en cada rama, no en la base: dos
             `focus:ring-*` en la misma clase compiten y ganaba el dorado,
             así que un campo con error enfocado dejaba de verse en rojo. */
          className={`w-full rounded-xl border bg-white/60 px-4 py-3 text-verde placeholder:text-verde-300 transition-all duration-300 focus:bg-white focus:outline-none focus:ring-2 ${
            accesorio ? "pr-12" : ""
          } ${
            error
              ? "border-error/60 focus:ring-error/30"
              : "border-beige hover:border-dorado/50 focus:ring-dorado/60"
          }`}
          {...props}
        />
        {accesorio && (
          <div className="absolute inset-y-0 right-1 flex items-center">
            {accesorio}
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
    </div>
  );
}
