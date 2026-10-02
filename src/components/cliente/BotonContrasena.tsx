"use client";

import { useState } from "react";
import CambiarContrasena from "@/components/admin/CambiarContrasena";

/**
 * «Contraseña» en la cabecera del área de cliente. Sobre todo para quien
 * recibió una contraseña temporal de recepción («Acceso web» en su ficha).
 *
 * Reutiliza el diálogo del panel: la regla es la misma (pide la actual y la
 * nueva dos veces) y la server action `cambiarMiContrasena` solo usa la
 * sesión, no el rol. Dos diálogos distintos para lo mismo acabarían
 * divergiendo.
 */
export default function BotonContrasena() {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-full px-3 text-sm sm:px-4 text-beige/85 transition-colors hover:text-arena"
      >
        Contraseña
      </button>
      <CambiarContrasena abierto={abierto} onCerrar={() => setAbierto(false)} />
    </>
  );
}
