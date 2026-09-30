import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresco de sesión y puerta de `/admin`.
 *
 * ⚠️ **Este archivo se llama `proxy.ts`, NO `middleware.ts`.** En Next 16 el
 * convenio `middleware` está deprecado y renombrado a `proxy`
 * (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`).
 * Toda la documentación de Supabase que circula por internet usa todavía el
 * nombre viejo: copiarla tal cual deja el archivo sin ejecutarse nunca, y el
 * panel abierto sin que nada avise.
 *
 * ⚠️ **Esto NO es la seguridad del panel, es comodidad.** Lo que impide de
 * verdad que alguien lea o escriba datos son las policies de RLS: un proxy
 * evita que se pinte una página, RLS evita que la base devuelva una fila. Si
 * este archivo desapareciera, `/admin` se pintaría vacío — feo, pero no
 * filtraría nada.
 *
 * Hace dos cosas, y el orden importa:
 *  1. Refresca el token en cada petición. Es lo que permite que los componentes
 *     de servidor —que no pueden escribir cookies— sigan viendo una sesión viva.
 *  2. Manda a `/login` a quien no haya entrado y pida una ruta del panel.
 */
export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesNuevas) {
          /* Se escriben en los DOS sitios a propósito: en `request` para que lo
             que se renderice después en esta misma petición ya vea la sesión
             nueva, y en `respuesta` para que el navegador se la guarde. Con solo
             una de las dos, o la página va un paso por detrás o la sesión se
             pierde en cuanto se recarga. */
          for (const { name, value } of cookiesNuevas) {
            request.cookies.set(name, value);
          }
          respuesta = NextResponse.next({ request });
          for (const { name, value, options } of cookiesNuevas) {
            respuesta.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  /* ⚠️ `getUser()` y no `getSession()`: el segundo se cree la cookie sin
     validarla, así que un token falsificado pasaría la puerta. Este además es
     el que dispara la renovación del token cuando ha caducado, que es el punto
     1 de la cabecera.

     El doc de Next recomienda que el proxy no haga comprobaciones contra un
     servidor porque corre en cada navegación (incluidos prefetch). Se asume el
     coste: sin esta llamada no hay refresco, y la sesión se caería sola a los
     pocos minutos. La comprobación cara de verdad —el ROL— no se hace aquí,
     sino en la base, vía RLS. */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith("/admin")) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    /* De dónde venía, para devolverle ahí después de entrar en vez de soltarle
       siempre en el dashboard. */
    destino.searchParams.set("volverA", request.nextUrl.pathname);
    return NextResponse.redirect(destino);
  }

  return respuesta;
}

export const config = {
  /* ⚠️ Sin `matcher` esto corre en TODAS las peticiones, incluidas las de
     `_next/static`, las imágenes optimizadas y lo que haya en `public/`. Además
     de gastar una llamada de red por cada archivo, la lógica de redirección
     puede acabar bloqueando el CSS y dejando la web sin estilos.

     El patrón es negativo —«todo MENOS esto»— y no positivo (`/admin/:path*`)
     porque el refresco de sesión tiene que ocurrir también en la web pública:
     si solo corriera en `/admin`, alguien que entra por `/login` y navega por la
     landing volvería al panel con el token ya caducado. */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|pdf)$).*)",
  ],
};
