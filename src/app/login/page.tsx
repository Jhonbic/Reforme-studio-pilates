"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import TextField from "@/components/auth/TextField";
import { Button } from "@/components/ui/Button";
import { crearClienteNavegador } from "@/lib/supabase/navegador";

/**
 * Inicio de sesión real, contra Supabase Auth.
 *
 * Clientas y equipo entran por la MISMA puerta y es el ROL quien decide a dónde
 * van. Antes ese rol se deducía del dominio del correo (`@reforme.com`), que
 * era un marcador y no autenticación: cualquiera que escribiese un correo así
 * entraba al panel, y la contraseña ni se leía. Ahora lo devuelve `mi_rol()`,
 * que consulta la ficha del personal en `equipo` con la sesión ya validada.
 *
 * ⚠️ **Tener cuenta no es tener acceso.** `mi_rol()` devuelve `null` a quien
 * está en `auth.users` pero sin ficha activa en `equipo` — el caso de cualquier
 * clienta que se registre, y de quien ya no trabaja en el estudio. A esas personas no se las manda al
 * panel: RLS no les dejaría leer nada y solo verían pantallas vacías.
 */
export default function LoginPage() {
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);

    const supabase = crearClienteNavegador();

    const { error: fallo } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (fallo) {
      /* ⚠️ Un solo mensaje para «ese correo no existe» y «la contraseña no es
         esa», a propósito: distinguirlos le confirmaría a quien va probando
         correos cuáles pertenecen a alguien del estudio. */
      setError("Correo o contraseña incorrectos.");
      setEnviando(false);
      return;
    }

    const { data: rol } = await supabase.rpc("mi_rol");

    if (!rol) {
      // Cuenta válida, pero no es personal del estudio: todavía no hay a dónde
      // llevarla. La vista de clienta llega con las reservas.
      setDone(true);
      setEnviando(false);
      return;
    }

    /* De dónde venía, si `proxy.ts` lo anotó al echarle a `/login`.
       ⚠️ Se comprueba que empiece por `/admin` antes de usarlo: un parámetro de
       la URL lo escribe cualquiera, y sin filtrarlo esto sería un redirector
       abierto — `?volverA=https://otro-sitio` mandaría a la gente fuera desde
       un enlace que parece del estudio.
       Se lee de `window` y no con `useSearchParams()` porque ese hook obliga a
       envolver la página en `<Suspense>` y la saca del prerenderizado; aquí
       solo hace falta en respuesta a un clic, que ocurre en el navegador. */
    const volverA = new URLSearchParams(window.location.search).get("volverA");
    const destino = volverA?.startsWith("/admin") ? volverA : "/admin";

    /* ⚠️ `refresh()` además de `push()`: la sesión acaba de escribirse en una
       cookie, pero el árbol de servidor que ya está en memoria se renderizó sin
       ella. Sin refrescar, el panel se pinta con la sesión vieja —es decir,
       vacío— hasta que alguien recargue a mano. */
    router.push(destino);
    router.refresh();
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
            Tu cuenta ya está creada, pero el espacio de clientas todavía no está
            abierto. Muy pronto podrás reservar tus clases desde aquí.
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div>
            <TextField
              id="password"
              label="Contraseña"
              type={showPass ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
                href="/recuperar"
                className="text-xs text-verde-300 transition-colors hover:text-dorado-dark"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>

          {/* `role="alert"` para que un lector lo anuncie al aparecer: el error
              sale después de pulsar, cuando el foco ya no está donde se pueda
              leer de paso. */}
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
            {enviando ? "Entrando…" : "Iniciar sesión"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
