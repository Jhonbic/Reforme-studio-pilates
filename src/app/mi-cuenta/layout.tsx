import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ClienteSidebar from "@/components/cliente/ClienteSidebar";
import ClienteTopbar from "@/components/cliente/ClienteTopbar";
import { SidebarProvider } from "@/context/SidebarContext";
import { ToastProvider } from "@/context/ToastContext";
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
 * ⚠️ **El mismo armazón que el panel** (decisión del usuario, oct 2026): barra
 * lateral verde con las secciones y cabecera que titula desde la ruta. Antes
 * era una cabecera verde con pestañas debajo. Sin goteo al clic, como el
 * panel: casi todo clic aquí es reservar, y una onda encima siembra la duda
 * de si se registró.
 */
export default async function LayoutMiCuenta({ children }: { children: React.ReactNode }) {
  const cuenta = await getMiCuenta();
  if (!cuenta) {
    redirect((await getUsuarioActual()) ? "/admin" : "/login?error=sin-acceso");
  }

  // Bajo el nombre, como el rol en el panel: su plan, o que no tiene.
  const detalle =
    cuenta.estado === "De baja"
      ? "Cuenta inactiva"
      : cuenta.plan && cuenta.estado !== "Vencida" && cuenta.estado !== "Sin plan"
        ? `Plan ${cuenta.plan}`
        : "Sin plan";

  return (
    <SidebarProvider>
      {/* `ToastProvider`: el diálogo de contraseña (compartido con el panel)
          avisa con el mismo sistema de avisos flotantes. */}
      <ToastProvider>
        <div className="flex min-h-[100svh] flex-col bg-arena lg:flex-row">
          <ClienteSidebar nombre={cuenta.nombre} detalle={detalle} />
          {/* `min-w-0`: sin él, un hijo flex no se encoge por debajo de su
              contenido y la tira de días ensancharía la página. */}
          <div className="flex min-w-0 flex-1 flex-col">
            <ClienteTopbar />
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
          </div>
        </div>
      </ToastProvider>
    </SidebarProvider>
  );
}
