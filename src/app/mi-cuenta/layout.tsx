import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import HeroFX from "@/components/fx/HeroFX";
import BotonContrasena from "@/components/cliente/BotonContrasena";
import { ToastProvider } from "@/context/ToastContext";
import { cerrarSesion } from "@/lib/auth/acciones";
import { getUsuarioActual } from "@/lib/admin/queries";
import { getMiCuenta } from "@/lib/cliente/datos";

export const metadata: Metadata = {
  title: "Mi cuenta · Reforme Studio Pilates",
  // Es el área privada de cada cliente: nada que indexar.
  robots: { index: false, follow: false },
};

/**
 * Armazón del área de cliente.
 *
 * Es la segunda puerta (la primera, `proxy.ts`, exige sesión): aquí se exige
 * además que la cuenta sea de un CLIENTE. Alguien del equipo que llega aquí
 * va a su panel, no a un área vacía.
 *
 * ⚠️ No usa el armazón del panel ni la Navbar de la web: es la tercera cara del
 * producto. Mantiene la marca de la web pública (verde, Cormorant, motas
 * doradas) porque quien entra aquí es un cliente, no alguien trabajando; pero
 * sin goteo al clic, como el panel: casi todo clic aquí es un botón de
 * reservar, y una onda encima siembra la duda de si se registró.
 */
export default async function LayoutMiCuenta({ children }: { children: React.ReactNode }) {
  const cuenta = await getMiCuenta();
  if (!cuenta) {
    redirect((await getUsuarioActual()) ? "/admin" : "/login?error=sin-acceso");
  }

  return (
    // `ToastProvider`: el diálogo de contraseña (compartido con el panel)
    // avisa con el mismo sistema de avisos flotantes.
    <ToastProvider>
    <div className="min-h-[100svh] bg-arena">
      <header className="relative isolate overflow-hidden bg-verde text-arena">
        <HeroFX className="-z-10" goteo={false} />
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Logo size={34} layout="horizontal" href="/" />
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden min-h-[44px] items-center rounded-full px-4 text-sm text-beige/85 transition-colors hover:text-arena sm:inline-flex"
            >
              Ver la web
            </Link>
            <BotonContrasena />
            {/* `<form>` con server action y no un enlace: un GET que cierra
                sesión lo dispararía cualquier precarga de enlaces. */}
            <form action={cerrarSesion}>
              <button
                type="submit"
                className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-full border border-arena/40 px-4 text-sm text-arena transition-colors hover:border-dorado hover:text-dorado-light"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">{children}</main>
    </div>
    </ToastProvider>
  );
}
