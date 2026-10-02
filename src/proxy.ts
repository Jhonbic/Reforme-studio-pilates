import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Portero del panel: sin sesión no se entra a `/admin`.
 *
 * Hace dos cosas en cada petición al panel:
 * 1. **Refresca la sesión.** El token de Supabase caduca cada hora; si nadie lo
 *    renueva aquí, los Server Components (que no pueden escribir cookies) lo
 *    verían caducado y echarían a la persona en mitad del trabajo.
 * 2. **Redirige a `/login`** si no hay usuario, guardando a dónde iba en
 *    `?siguiente=` para devolverla allí al entrar.
 *
 * ⚠️ Esto es la comprobación RÁPIDA, no la única. Mira si hay sesión, no si la
 * cuenta es del estudio: eso lo decide `getUsuarioActual()` en el layout,
 * leyendo `perfiles`. Y por debajo de las dos está RLS, que es lo que de verdad
 * impide leer una fila (ver `docs/BASE_DE_DATOS.md`).
 *
 * El matcher deja fuera la web pública a propósito: la landing no necesita
 * sesión y no tiene por qué pagar el viaje a Supabase.
 */
export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(lista) {
          // Las cookies renovadas se escriben en la petición (para que el
          // render de ahora ya las vea) y en la respuesta (para el navegador).
          lista.forEach(({ name, value }) => request.cookies.set(name, value));
          respuesta = NextResponse.next({ request });
          lista.forEach(({ name, value, options }) =>
            respuesta.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // ⚠️ `getClaims()` y no `getSession()`: getSession se fía de la cookie tal
  // cual, y una cookie la puede escribir cualquiera. getClaims verifica la firma.
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    destino.searchParams.set(
      "siguiente",
      request.nextUrl.pathname + request.nextUrl.search,
    );
    return NextResponse.redirect(destino);
  }

  return respuesta;
}

export const config = {
  matcher: ["/admin/:path*"],
};
