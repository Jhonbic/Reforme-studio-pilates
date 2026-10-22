"use client";

import { useState } from "react";
import CambiarContrasena from "@/components/admin/CambiarContrasena";

/**
 * «Cambiar contraseña» en «Mi cuenta» (antes en la cabecera del área de
 * cliente; se mudó al partir el área en pestañas, oct 2026). Sobre todo para quien
 * recibió una contraseña temporal de recepción («Crear contraseña web» en su ficha).
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
        className="inline-flex min-h-[44px] w-full items-center justify-center whitespace-nowrap rounded-full bg-verde px-5 text-sm font-medium text-arena transition-colors duration-300 hover:bg-verde-900 sm:w-auto"
      >
        Cambiar contraseña
      </button>
      <CambiarContrasena abierto={abierto} onCerrar={() => setAbierto(false)} />
    </>
  );
}
