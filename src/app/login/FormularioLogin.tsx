"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import TextField from "@/components/auth/TextField";
import BotonVerContrasena from "@/components/auth/BotonVerContrasena";
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
          accesorio={
            <BotonVerContrasena
              visible={showPass}
              onToggle={() => setShowPass((v) => !v)}
              campo="password"
            />
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
          falló, a propósito).
          En dorado de marca y no en rojo (decisión del usuario). El dorado va en
          el marco, el fondo y el icono, pero el TEXTO es verde: `dorado-dark`
          sobre claro da 3,8:1 y no llega al 4,5 de AA para texto pequeño. */}
      {mensaje && (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-dorado/70 bg-dorado/10 px-4 py-3 text-sm text-verde"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            className="mt-px h-5 w-5 shrink-0 text-dorado-dark"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5.5M12 16.5v.01" />
          </svg>
          {mensaje}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        sheen={false}
        disabled={enviando}
      >
        {enviando ? "Entrando…" : "Iniciar sesión"}
      </Button>
    </form>
  );
}
