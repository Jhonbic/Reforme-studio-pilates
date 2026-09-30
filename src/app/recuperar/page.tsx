"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import TextField from "@/components/auth/TextField";
import { Button } from "@/components/ui/Button";
import { crearClienteNavegador } from "@/lib/supabase/navegador";
import { esCorreo } from "@/lib/validacion";

/* `/auth/confirmar` devuelve aquí con `?error=enlace` cuando el enlace del
   correo caducó o ya se usó. Se lee con `useSyncExternalStore` y no con
   `useSearchParams()`: ese hook obliga a envolver la página en `<Suspense>` y
   la saca del prerenderizado. En el servidor no hay URL que leer → `false`. */
const sinSuscripcion = () => () => {};
const leerEnlaceCaducado = () =>
  new URLSearchParams(window.location.search).get("error") === "enlace";

/**
 * Paso 1 de la recuperación: pedir el enlace por correo.
 *
 * ⚠️ **La respuesta es la MISMA exista la cuenta o no.** Decir «ese correo no
 * está registrado» convertiría esta pantalla en un buscador de quién es
 * clienta del estudio. Es la misma regla que el mensaje único del `/login`.
 *
 * ⚠️ **El correo solo llega de verdad con un SMTP propio configurado en
 * Supabase.** El servidor de correo que trae incluido es de pruebas: envía
 * unos pocos por hora y solo a los miembros del equipo del proyecto. Sin SMTP
 * esta pantalla dice «revisa tu correo» y a la clienta no le llega nada.
 */
export default function RecuperarPage() {
  const enlaceCaducado = useSyncExternalStore(
    sinSuscripcion,
    leerEnlaceCaducado,
    () => false,
  );
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!esCorreo(email)) {
      setError("Introduce un correo válido.");
      return;
    }
    setError(null);
    setEnviando(true);

    const supabase = crearClienteNavegador();
    /* `redirectTo` es lo que la plantilla del correo pinta como
       `{{ .RedirectTo }}`. Se construye desde el origen actual para que el
       enlace vuelva al mismo sitio desde el que se pidió: localhost, una
       vista previa de Netlify o producción.
       ⚠️ Tiene que estar en la lista de Redirect URLs de Supabase; si no, se
       cambia en silencio por la Site URL y el enlace llega roto. */
    const { error: fallo } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${window.location.origin}/auth/confirmar` },
    );
    setEnviando(false);

    if (fallo) {
      /* Supabase no falla por un correo inexistente (eso lo calla él), así que
         lo que llega aquí es de verdad: casi siempre, pedir otro enlace antes
         de que pase un minuto. */
      setError(
        fallo.status === 429
          ? "Acabamos de enviarte un enlace. Espera un minuto antes de pedir otro."
          : "No pudimos enviar el correo. Inténtalo de nuevo en unos minutos.",
      );
      return;
    }

    setEnviado(true);
  }

  return (
    <AuthShell
      headline="Volvamos a empezar."
      tagline="Te enviaremos un enlace para que elijas una contraseña nueva y sigas con tu práctica."
    >
      <div className="mb-8 text-center lg:text-left">
        <p className="eyebrow text-dorado-dark">Recuperar contraseña</p>
        <h1 className="mt-3 font-display text-4xl text-verde">
          ¿Olvidaste tu contraseña?
        </h1>
        <p className="mt-2 text-verde-700">
          Escribe el correo con el que te registraste.
        </p>
      </div>

      {enviado ? (
        <div
          role="status"
          className="rounded-2xl border border-beige bg-white/60 p-6 text-center"
        >
          <p className="font-display text-2xl text-verde">Revisa tu correo ✦</p>
          <p className="mt-2 text-sm text-verde-700">
            Si <strong className="font-medium">{email.trim()}</strong> está
            registrado, te llegará un enlace en unos minutos. Mira también en
            spam o promociones.
          </p>
          <button
            onClick={() => setEnviado(false)}
            className="mt-4 text-sm text-dorado-dark underline-offset-4 hover:underline"
          >
            Usar otro correo
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          {enlaceCaducado && !error && (
            <p className="rounded-xl border border-beige bg-white/60 px-4 py-3 text-sm text-verde-700">
              Ese enlace ya no es válido: caduca en una hora y solo sirve una
              vez. Pide uno nuevo aquí.
            </p>
          )}

          <TextField
            id="email"
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            required
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
          />

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-400/50 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={enviando}
          >
            {enviando ? "Enviando…" : "Enviarme el enlace"}
          </Button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-verde-700 lg:text-left">
        <Link
          href="/login"
          className="font-medium text-dorado-dark underline-offset-4 hover:underline"
        >
          ← Volver a iniciar sesión
        </Link>
      </p>
    </AuthShell>
  );
}
