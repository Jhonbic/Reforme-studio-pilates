import Link from "next/link";
import type { Metadata } from "next";
import Logo from "@/components/Logo";
import AdminNav from "@/components/admin/AdminNav";
import AdminTopbar from "@/components/admin/AdminTopbar";
import HeroFX from "@/components/fx/HeroFX";

export const metadata: Metadata = {
  title: "Panel administrativo · Reforme Studio Pilates",
  robots: { index: false, follow: false },
};

export default function AdminLayout(props: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-[100svh] flex-col bg-arena lg:flex-row">
      <aside className="hidden shrink-0 isolate overflow-hidden bg-verde text-arena lg:sticky lg:top-0 lg:flex lg:h-[100svh] lg:w-64 lg:flex-col lg:justify-between lg:overflow-y-auto">
        <HeroFX className="-z-10" goteo={false} />

        <div>
          <div className="border-b border-verde-700 px-6 py-6">
            <Logo size={30} layout="horizontal" href="/admin" />
          </div>
          <div className="px-4 py-6">
            <AdminNav variante="lateral" />
          </div>
        </div>

        <div className="border-t border-verde-700 px-4 py-5">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-beige/80 transition-colors hover:text-dorado"
          >
            ← Ver la web pública
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 isolate overflow-hidden bg-verde text-arena lg:hidden">
          <HeroFX className="-z-10" goteo={false} />
          <div className="flex items-center justify-between px-4 py-4">
            <Logo size={26} layout="horizontal" href="/admin" />
            <Link
              href="/"
              className="text-xs text-beige/80 transition-colors hover:text-dorado"
            >
              Ver web →
            </Link>
          </div>
          <AdminNav variante="movil" />
        </header>

        <AdminTopbar />

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-6 lg:py-6 xl:px-8">
          {props.children}
        </main>
      </div>
    </div>
  );
}
