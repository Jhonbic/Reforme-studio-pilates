"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import TextField from "@/components/auth/TextField";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false);
  const [done, setDone] = useState(false);

  // Solo UI por ahora: no hay backend. Simulamos el envío.
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setDone(true);
  }

  return (
    <AuthShell
      headline="Bienvenida de nuevo."
      tagline="Accede a tu cuenta para gestionar tus reservas y continuar tu práctica con nosotros."
    >
      <div className="mb-8 text-center lg:text-left">
        <p className="eyebrow text-dorado-dark">Iniciar sesión</p>
        <h1 className="mt-3 font-display text-4xl text-verde">
          Entra a tu cuenta
        </h1>
        <p className="mt-2 text-verde-700">
          ¿Aún no tienes una?{" "}
          <Link
            href="/registro"
            className="font-medium text-dorado-dark underline-offset-4 hover:underline"
          >
            Regístrate
          </Link>
        </p>
      </div>

      {done ? (
        <div className="rounded-2xl border border-beige bg-white/60 p-6 text-center">
          <p className="font-display text-2xl text-verde">Casi listo ✦</p>
          <p className="mt-2 text-sm text-verde-700">
            El inicio de sesión aún no está conectado. Estamos preparando tu
            espacio; muy pronto podrás acceder a tu cuenta.
          </p>
          <button
            onClick={() => setDone(false)}
            className="mt-4 text-sm text-dorado-dark underline-offset-4 hover:underline"
          >
            Volver
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <TextField
            id="email"
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            required
            placeholder="tu@correo.com"
          />

          <div>
            <TextField
              id="password"
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

          <Button type="submit" variant="primary" size="lg" className="w-full">
            Iniciar sesión
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
