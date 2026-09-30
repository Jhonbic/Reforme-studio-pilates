import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Cliente de Supabase para el NAVEGADOR.
 *
 * Lo usan los componentes de cliente: hoy solo `/login` y `/registro`, para
 * iniciar y cerrar sesión. Las consultas de datos no pasan por aquí — se hacen
 * en el servidor, que es donde vive `queries.ts`.
 *
 * ⚠️ Solo la clave **publishable** (la sucesora de la antigua `anon`). Es pública por diseño y viaja en el bundle: lo
 * que impide que alguien la use para leer la base entera no es esconderla, es
 * RLS. La clave secreta no entra en la app: solo la usan los scripts de
 * `scripts/`, que corren en el PC de quien desarrolla.
 */
export function crearClienteNavegador() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
