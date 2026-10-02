"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import TextField from "@/components/auth/TextField";
import { Button } from "@/components/ui/Button";
import { iniciarSesion, type EstadoLogin } from "@/lib/auth/acciones";

type Props = {
  /** Ruta del panel a la que volver al entrar (`?siguiente=`). */
  siguiente?: string;
  /** Aviso con el que se llega desde una redirección del panel. */
  aviso?: string;
};

/**
 * El formulario de `/login`. Envía a la server action `iniciarSesion`.
 *
 * Sin JS también funciona: es un `<form action>` de verdad, y la acción
 * redirige o devuelve el error. `useActionState` solo añade el estado de
 * «Entrando…» y el mensaje sin recargar.
 *
 * ⚠️ El correo va con `defaultValue` del estado: React 19 vacía el formulario al
 * terminar la acción, y sin esto un fallo de contraseña borraría también el
 * correo que estaba bien.
 */
export default function FormularioLogin({ siguiente, aviso }: Props) {
  const [showPass, setShowPass] = useState(false);
  const [estado, enviar, enviando] = useActionState<EstadoLogin, FormData>(
    iniciarSesion,
    {},
  );
  const mensaje = estado.error ?? aviso;

  return (
    <form action={enviar} className="space-y-5" noValidate>
      {siguiente && <input type="hidden" name="siguiente" value={siguiente} />}

      <TextField
        id="email"
        name="email"
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        required
        placeholder="tu@correo.com"
        defaultValue={estado.correo}
      />

      <div>
        <TextField
          id="password"
          name="password"
          label="Contraseña"
          type={showPass ? "text" : "password"}
          autoComplete="current-password"
          required
          placeholder="••••••••"
          hint={
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="text-xs text-verde-300 transition-colors hover:text-dorado-dark"
            >
              {showPass ? "Ocultar" : "Mostrar"}
            </button>
          }
        />
        <div className="mt-2 text-right">
          <Link
            href="#"
            className="text-xs text-verde-300 transition-colors hover:text-dorado-dark"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </div>

      {/* Un solo mensaje para el formulario entero, no uno por campo: el error
          de credenciales no es de ningún campo en concreto (no se dice cuál
          falló, a propósito). */}
      {mensaje && (
        <p
          role="alert"
          className="rounded-xl border border-red-400/50 bg-red-50/70 px-4 py-3 text-sm text-red-700"
        >
          {mensaje}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={enviando}
      >
        {enviando ? "Entrando…" : "Iniciar sesión"}
      </Button>
    </form>
  );
}
