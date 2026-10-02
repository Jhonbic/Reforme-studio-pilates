import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMiCuenta } from "@/lib/cliente/datos";
import AdminTopbar from "@/components/admin/AdminTopbar";
import AppSidebar from "@/components/admin/AppSidebar";
import { SidebarProvider } from "@/context/SidebarContext";
import { ToastProvider } from "@/context/ToastContext";
import { hoyEnBogota } from "@/lib/admin/horario";
import { getNotificaciones, getUsuarioActual } from "@/lib/admin/queries";

export const metadata: Metadata = {
  title: "Panel administrativo · Reforme Studio Pilates",
  // El panel no es contenido público
  robots: { index: false, follow: false },
};

/**
 * Armazón del panel administrativo.
 *
 * Deliberadamente NO usa el Navbar ni el Footer de la web pública: son dos
 * productos distintos. Aquí no hay efectos de scroll, grano ni parallax — en
 * una herramienta de trabajo estorban. Lo que sí se hereda es la marca:
 * tipografías, verde y dorado.
 *
 * ⚠️ **Este componente es de SERVIDOR y es donde se piden los datos de sesión.**
 * La cuenta y los avisos se leen aquí y bajan como props a `AdminTopbar`, que sí
 * es de cliente.
 *
 * ⚠️ **Es la segunda puerta, no la única.** `proxy.ts` ya echa a quien no tiene
 * sesión; aquí se echa además a quien tiene sesión pero no perfil del estudio.
 * Leer la sesión usa cookies, así que **el panel ya no se prerenderiza**: cada
 * ruta de `/admin` se pinta por petición. Es el precio de tener auth de verdad.
 *
 * `LayoutProps<'/admin'>` es un helper global de Next 16, no se importa.
 */
export default async function AdminLayout(props: LayoutProps<"/admin">) {
  const usuario = await getUsuarioActual();
  if (!usuario) {
    // Un cliente que escribe /admin en la barra no es un intruso: se le lleva
    // a su área. A cualquier otro, al login.
    redirect((await getMiCuenta()) ? "/mi-cuenta" : "/login?error=sin-acceso");
  }
  const avisos = await getNotificaciones(hoyEnBogota());

  return (
    <SidebarProvider>
      <ToastProvider>
        <div className="flex min-h-[100svh] flex-col bg-arena lg:flex-row">
          <AppSidebar />

          {/* ⚠️ `min-w-0` es obligatorio, no cosmético: un hijo flex tiene
              `min-width: auto` y no se encoge por debajo de su contenido. Sin
              esto, una rejilla ancha desborda la columna y —peor aquí— el
              ResizeObserver de los gráficos mediría un ancho inflado, que es
              justo el bug del estiramiento de las gráficas. */}
          <div className="flex min-w-0 flex-1 flex-col">
            <AdminTopbar
              usuario={usuario}
              avisos={avisos}
            />

            <main className="flex-1 px-4 py-5 sm:px-6 lg:px-6 lg:py-6 xl:px-8">
              {props.children}
            </main>
          </div>
        </div>
      </ToastProvider>
    </SidebarProvider>
  );
}
