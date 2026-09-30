import { NextResponse, type NextRequest } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/servidor";

/**
 * Destino del enlace del correo de recuperación.
 *
 * Canjea el `token_hash` por una sesión (se escribe en cookies) y manda a
 * elegir la contraseña nueva. Es una ruta y no una página porque no pinta
 * nada: valida y redirige.
 *
 * ⚠️ **`token_hash` + `verifyOtp()`, NO el `?code=` que usa Supabase por
 * defecto.** El `code` es PKCE: solo se puede canjear en el MISMO navegador
 * que pidió el enlace. En móvil casi nadie cumple eso —se pide desde Chrome y
 * el correo se abre en la app de Gmail, que usa su propio navegador— y el
 * enlace fallaría con «inválido» siendo correcto. El `token_hash` funciona en
 * cualquier navegador. Por eso la plantilla del correo en Supabase tiene que
 * apuntar aquí con ese parámetro (ver `docs/BASE_DE_DATOS.md`).
 *
 * Solo acepta `type=recovery`. La confirmación de alta, cuando `/registro`
 * cree cuentas de verdad, pasará por aquí mismo con su propio destino.
 */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const tipo = request.nextUrl.searchParams.get("type");

  const destino = request.nextUrl.clone();
  destino.search = "";

  if (tokenHash && tipo === "recovery") {
    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.verifyOtp({
      type: "recovery",
      token_hash: tokenHash,
    });

    if (!error) {
      destino.pathname = "/nueva-contrasena";
      return NextResponse.redirect(destino);
    }
  }

  /* Caducado (1 h), ya usado o manipulado: los tres se resuelven igual,
     pidiendo otro. No se distingue cuál fue — a la clienta no le cambia nada. */
  destino.pathname = "/recuperar";
  destino.searchParams.set("error", "enlace");
  return NextResponse.redirect(destino);
}
