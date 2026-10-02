import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./tipos";

/**
 * Cliente de Supabase con la clave `service_role`: **se salta RLS entera**.
 *
 * ⚠️ `import "server-only"` hace FALLAR LA COMPILACIÓN si algún componente de
 * cliente importa este archivo, aunque sea sin querer y de rebote. Esta clave
 * en el navegador abriría la base completa a cualquiera.
 *
 * Existe solo para lo que la clave anónima no puede hacer: crear cuentas de
 * acceso y cambiarles la contraseña (`auth.admin`). Todo lo demás —incluido lo
 * que hace Administración— va por `crearClienteServidor()`, con la sesión de
 * quien pide y RLS por delante.
 *
 * `null` si falta la variable: el panel funciona sin ella, solo que «Dar
 * acceso» lo dice en vez de reventar.
 */
export function crearClienteAdmin() {
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!clave) return null;
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, clave, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
