import type { Metadata } from "next";
import { SidebarProvider } from "@/context/SidebarContext";
import { ToastProvider } from "@/context/ToastContext";
import AppSidebar from "@/components/admin/AppSidebar";
import AppHeader from "@/components/admin/AppHeader";
import AdminTopbar from "@/components/admin/AdminTopbar";

export const metadata: Metadata = {
  title: "Panel administrativo · Reforme Studio Pilates",
  robots: { index: false, follow: false },
};

export default function AdminLayout(props: LayoutProps<"/admin">) {
  return (
    <SidebarProvider>
      <ToastProvider>
        <div className="flex h-[100svh] flex-col bg-white lg:flex-row">
          {/* Sidebar */}
          <AppSidebar />

          {/* Columna principal */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {/* Header */}
            <AppHeader />

            {/* Topbar con título */}
            <AdminTopbar />

            {/* Contenido */}
            <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-6 lg:py-6 xl:px-8">
              {props.children}
            </main>
          </div>
        </div>
      </ToastProvider>
    </SidebarProvider>
  );
}
