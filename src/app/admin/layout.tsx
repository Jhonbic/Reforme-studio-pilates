import Link from "next/link";
import type { Metadata } from "next";
import Logo from "@/components/Logo";
import AdminNav from "@/components/admin/AdminNav";
import AdminTopbar from "@/components/admin/AdminTopbar";
import HeroFX from "@/components/fx/HeroFX";
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
 * `LayoutProps<'/admin'>` es un helper global de Next 16, no se importa.
 */
export default function AdminLayout(props: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-[100svh] flex-col bg-arena lg:flex-row">
      {/* ---------- Barra lateral (escritorio) ----------
          `sticky` + alto de viewport: la navegación acompaña al scroll en vez
          de irse hacia arriba. Necesita alto propio porque, como hijo flex, el
          `stretch` por defecto la haría tan alta como toda la página y no
          quedaría recorrido por el que pegarse. */}
      <aside className="hidden shrink-0 isolate overflow-hidden bg-verde text-arena lg:sticky lg:top-0 lg:flex lg:h-[100svh] lg:w-64 lg:flex-col lg:justify-between lg:overflow-y-auto">
        {/* Motas y estela, sin goteo. `isolate` + `-z-10` lo dejan detrás del
            menú; el canvas es `pointer-events-none`, así que los enlaces siguen
            siendo clicables con normalidad. */}
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

      {/* ---------- Columna de contenido ----------
          ⚠️ `min-w-0` es obligatorio, no cosmético: un hijo flex tiene
          `min-width: auto` y no se encoge por debajo de su contenido. Sin esto,
          una rejilla ancha desborda la columna y —peor aquí— el ResizeObserver
          de los gráficos mediría un ancho inflado, que es justo el bug del
          estiramiento que se acaba de arreglar. */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Cabecera (móvil) */}
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

        {/* El usuario se resuelve AQUÍ, en el servidor, y baja como prop:
            `AdminTopbar` es cliente por `usePathname`, y el día que
            `getUsuarioActual()` pase a ser `async` contra la base de datos, un
            componente de cliente no podría esperarlo. */}
        <AdminTopbar
          usuario={getUsuarioActual()}
          avisos={getNotificaciones()}
        />

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-6 lg:py-6 xl:px-8">
          {props.children}
        </main>
      </div>
    </div>
  );
}
