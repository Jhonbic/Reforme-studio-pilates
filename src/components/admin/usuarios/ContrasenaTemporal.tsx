"use client";

import { useState } from "react";

const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center justify-center gap-2 overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde";
const BOTON_PRIMARIO =
  "inline-flex min-h-[44px] items-center justify-center rounded-full bg-dorado px-5 text-sm font-medium text-verde-900 transition-colors duration-300 hover:bg-dorado-dark";

/**
 * La contraseña temporal recién creada, para entregarla en mano.
 *
 * ⚠️ **Se enseña UNA vez.** No se guarda en ningún sitio que se pueda volver
 * a leer (Supabase solo guarda su hash), así que quien la usa no cierra el
 * diálogo solo: se queda aquí hasta pulsar «Hecho». Si se pierde, se genera
 * otra. La primera vez que la persona entre tendrá que cambiarla.
 */
export default function ContrasenaTemporal({
  nombre,
  correo,
  contrasena,
  onHecho,
}: {
  nombre: string;
  correo: string;
  contrasena: string;
  onHecho: () => void;
}) {
  const [copiada, setCopiada] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(contrasena);
      setCopiada(true);
    } catch {
      // Sin permiso de portapapeles (http, navegador viejo): queda a la vista
      // y seleccionable, que es lo que importa.
      setCopiada(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-verde-700">
        Contraseña temporal de <strong>{nombre}</strong>. Entra con su correo{" "}
        <strong className="break-all">{correo}</strong> y esta contraseña, y la primera vez
        tendrá que elegir una suya.
      </p>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dorado/50 bg-dorado/10 px-4 py-3">
        <code className="select-all font-cifra text-xl font-normal tracking-wider text-verde">
          {contrasena}
        </code>
        <button type="button" onClick={copiar} className={BOTON}>
          <span className="control-sheen" aria-hidden="true" />
          {copiada ? "Copiada ✓" : "Copiar"}
        </button>
      </div>
      <p className="text-xs text-verde-300">
        ⚠️ No se volverá a enseñar: guárdala o entrégala ahora. Si se pierde, genera otra.
      </p>
      <div className="flex justify-end">
        <button type="button" onClick={onHecho} className={BOTON_PRIMARIO}>
          Hecho
        </button>
      </div>
    </div>
  );
}
