import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import { cerrarSesion } from "@/lib/auth/acciones";
import { debeCambiarContrasena } from "@/lib/auth/temporal";
import { crearClienteServidor } from "@/lib/supabase/server";
import FormularioCambio from "./FormularioCambio";

export const metadata: Metadata = {
  title: "Elige tu contraseña · Reforme Studio Pilates",
  robots: { index: false, follow: false },
};

/**
 * Primer inicio con una contraseña temporal (las que da el estudio al crear
 * un perfil del equipo o la contraseña web de un cliente): antes de entrar,
 * la persona elige la suya. `proxy.ts` trae aquí cualquier ruta del panel o
 * de `/mi-cuenta` mientras no lo haga.
 *
 * Sin sesión → al login. Sin contraseña temporal → a su zona: nadie tiene
 * nada que hacer aquí después.
 */
export default async function CambiarContrasenaPage() {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  if (!debeCambiarContrasena(data.user)) {
    const { data: perfil } = await supabase.from("perfiles").select("id").eq("id", data.user.id).maybeSingle();
    redirect(perfil ? "/admin" : "/mi-cuenta");
  }

  return (
    <AuthShell
      headline="Tu cuenta, tu contraseña."
      tagline="Entraste con una contraseña temporal. Elige una que solo sepas tú para seguir."
    >
      <div className="mb-8 text-center lg:text-left">
        <p className="eyebrow text-dorado-tinta">Primer inicio</p>
        <h1 className="mt-3 font-display text-4xl text-verde">Elige tu contraseña</h1>
        <p className="mt-2 text-verde-700">
          Entraste como <strong className="font-medium">{data.user.email}</strong> con una contraseña
          temporal. Cámbiala por una tuya para continuar.
        </p>
      </div>

      <FormularioCambio />

      <form action={cerrarSesion} className="mt-6 text-center lg:text-left">
        <button
          type="submit"
          className="text-sm text-verde-300 underline-offset-4 transition-colors hover:text-dorado-tinta hover:underline"
        >
          No soy yo · cerrar sesión
        </button>
      </form>
    </AuthShell>
  );
}
