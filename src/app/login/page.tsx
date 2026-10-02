import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import FormularioLogin from "./FormularioLogin";

/**
 * Una sola puerta para clientes y equipo: decide el perfil, no la URL
 * (decisión del usuario, frente a un `/admin/login` aparte).
 *
 * Autenticación real con Supabase (`lib/auth/acciones.ts`). Hoy solo el equipo
 * tiene a dónde entrar: una cuenta sin fila en `perfiles` recibe un mensaje en
 * vez de un panel vacío. El área de clientes es la fase de Reservas.
 *
 * Es de servidor para leer `?siguiente=` (a dónde volver) y `?error=` (por qué
 * se llegó aquí). Eso la vuelve dinámica, que en una página de login no cuesta
 * nada.
 */
const AVISOS: Record<string, string> = {
  "sin-acceso":
    "Tu sesión no tiene acceso al panel. Entra con una cuenta del equipo.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { siguiente, error } = await searchParams;

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

      <FormularioLogin
        siguiente={typeof siguiente === "string" ? siguiente : undefined}
        aviso={typeof error === "string" ? AVISOS[error] : undefined}
      />
    </AuthShell>
  );
}
