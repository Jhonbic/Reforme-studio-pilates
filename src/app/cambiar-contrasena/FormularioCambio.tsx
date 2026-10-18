"use client";

import { useActionState, useState } from "react";
import TextField from "@/components/auth/TextField";
import BotonVerContrasena from "@/components/auth/BotonVerContrasena";
import { Button } from "@/components/ui/Button";
import { cambiarContrasenaInicial, type EstadoCambio } from "@/lib/auth/acciones";

/**
 * Elegir la contraseña propia tras entrar con una temporal. Mismo montaje que
 * `FormularioLogin`: `<form action>` de verdad y `useActionState` solo para el
 * «Guardando…» y el mensaje.
 *
 * La nueva se escribe dos veces: un error al teclear una contraseña que no se
 * ve dejaría a la persona fuera justo al estrenar su cuenta.
 */
export default function FormularioCambio() {
  const [ver, setVer] = useState(false);
  const [estado, enviar, enviando] = useActionState<EstadoCambio, FormData>(
    cambiarContrasenaInicial,
    {},
  );

  return (
    <form action={enviar} className="space-y-5" noValidate>
      <TextField
        id="nueva"
        name="nueva"
        label="Contraseña nueva"
        type={ver ? "text" : "password"}
        autoComplete="new-password"
        required
        minLength={8}
        hint={<span className="text-xs text-verde-300">Al menos 8 caracteres</span>}
        accesorio={<BotonVerContrasena visible={ver} onToggle={() => setVer((v) => !v)} campo="nueva" />}
      />
      <TextField
        id="repetida"
        name="repetida"
        label="Repite la contraseña"
        type={ver ? "text" : "password"}
        autoComplete="new-password"
        required
        minLength={8}
      />

      {estado.error && (
        <p
          role="alert"
          className="rounded-xl border border-error/40 bg-error/5 px-4 py-3 text-sm text-error"
        >
          {estado.error}
        </p>
      )}

      <Button type="submit" variant="primary" size="lg" className="w-full" sheen={false} disabled={enviando}>
        {enviando ? "Guardando…" : "Guardar y entrar"}
      </Button>
    </form>
  );
}
