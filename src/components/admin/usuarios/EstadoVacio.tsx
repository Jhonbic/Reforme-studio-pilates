"use client";

/** Lo que se ve cuando ningún registro pasa el filtro. Siempre ofrece la
 *  salida: quien no encuentra nada suele haber dejado un filtro puesto sin
 *  darse cuenta. */
export default function EstadoVacio({ onLimpiar }: { onLimpiar: () => void }) {
  return (
    <div className="px-4 py-14 text-center sm:px-5">
      <p className="font-display text-xl text-verde">
        No hay nadie que coincida
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-verde-300">
        Prueba con otro nombre o identificación, o quita alguno de los filtros
        que tienes puestos.
      </p>
      <button
        type="button"
        onClick={onLimpiar}
        className="mt-5 inline-flex min-h-[44px] items-center rounded-full border border-verde/40 px-5 text-sm text-verde transition-colors duration-300 hover:border-verde hover:bg-verde hover:text-arena"
      >
        Limpiar filtros
      </button>
    </div>
  );
}
