"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import TextField from "@/components/auth/TextField";
import { Button } from "@/components/ui/Button";
import { crearClienteNavegador } from "@/lib/supabase/navegador";

type Errores = Partial<Record<"password" | "confirm" | "general", string>>;

/**
 * Paso 3 de la recuperación: elegir la contraseña nueva.
 *
 * Se llega desde `/auth/confirmar`, que ya dejó abierta una sesión de
 * recuperación en cookies; `updateUser()` la usa sin que haya que pasarle
 * nada. Quien entre aquí escribiendo la URL no tiene esa sesión, y lo averigua
 * al enviar: el mensaje le manda a pedir un enlace.
 *
 * ⚠️ **Al terminar se CIERRA la sesión en todos los dispositivos**, y se pide
 * entrar con la contraseña nueva. Dos motivos: si alguien había entrado en la
 * cuenta, cambiar la contraseña tiene que echarle; y entrar a mano confirma que
 * la clienta recuerda lo que acaba de escribir.
 */
export default function NuevaContrasenaPage() {
  const [showPass, setShowPass] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const [sinSesion, setSinSesion] = useState(false);
  const [hecho, setHecho] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    // Mismas reglas que `/registro`: la contraseña nueva no puede ser más débil
    // que la que se pide al crear la cuenta.
    const nuevos: Errores = {};
    if (password.length < 8) nuevos.password = "Mínimo 8 caracteres.";
    if (confirm !== password) nuevos.confirm = "Las contraseñas no coinciden.";
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setEnviando(true);
    const supabase = crearClienteNavegador();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setEnviando(false);
      if (error.name === "AuthSessionMissingError") {
        setSinSesion(true);
      } else if (error.code === "same_password") {
        setErrores({ password: "Tiene que ser distinta de la anterior." });
      } else if (error.code === "weak_password") {
        setErrores({ password: "Esa contraseña es demasiado fácil de adivinar." });
      } else {
        setErrores({
          general: "No pudimos guardar la contraseña. Inténtalo de nuevo.",
        });
      }
      return;
    }

    await supabase.auth.signOut({ scope: "global" });
    setEnviando(false);
    setHecho(true);
  }

  return (
    <AuthShell
      headline="Un nuevo comienzo."
      tagline="Elige una contraseña que recuerdes y vuelve a tu práctica."
    >
      <div className="mb-8 text-center lg:text-left">
        <p className="eyebrow text-dorado-dark">Recuperar contraseña</p>
        <h1 className="mt-3 font-display text-4xl text-verde">
          Elige tu nueva contraseña
        </h1>
      </div>

      {hecho ? (
        <div
          role="status"
          className="rounded-2xl border border-beige bg-white/60 p-6 text-center"
        >
          <p className="font-display text-2xl text-verde">Contraseña actualizada ✦</p>
          <p className="mt-2 text-sm text-verde-700">
            Ya puedes entrar con tu contraseña nueva.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block text-sm font-medium text-dorado-dark underline-offset-4 hover:underline"
          >
            Iniciar sesión
          </Link>
        </div>
      ) : sinSesion ? (
        <div
          role="alert"
          className="rounded-2xl border border-beige bg-white/60 p-6 text-center"
        >
          <p className="font-display text-2xl text-verde">El enlace ya no es válido</p>
          <p className="mt-2 text-sm text-verde-700">
            Para cambiar la contraseña hay que entrar desde el enlace del correo,
            que caduca en una hora.
          </p>
          <Link
            href="/recuperar"
            className="mt-4 inline-block text-sm font-medium text-dorado-dark underline-offset-4 hover:underline"
          >
            Pedir un enlace nuevo
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <TextField
            id="password"
            label="Contraseña nueva"
            type={showPass ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrores((v) => ({ ...v, password: undefined, general: undefined }));
            }}
            error={errores.password}
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

          <TextField
            id="confirm"
            label="Confirmar contraseña"
            type={showPass ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Repite tu contraseña"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setErrores((v) => ({ ...v, confirm: undefined, general: undefined }));
            }}
            error={errores.confirm}
          />

          {errores.general && (
            <p
              role="alert"
              className="rounded-xl border border-red-400/50 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {errores.general}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={enviando}
          >
            {enviando ? "Guardando…" : "Guardar contraseña"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
