import type { ComponentProps, ReactNode } from "react";

type TextFieldProps = ComponentProps<"input"> & {
  label: string;
  id: string;
  hint?: ReactNode;
  error?: string;
};

/** Campo de texto con etiqueta, estética de marca y estado de error. */
export default function TextField({
  label,
  id,
  hint,
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
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-xl border bg-white/60 px-4 py-3 text-verde placeholder:text-verde-300 transition-all duration-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-dorado/60 ${
          error
            ? "border-red-400/70 focus:ring-red-300"
            : "border-beige hover:border-dorado/50"
        }`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
