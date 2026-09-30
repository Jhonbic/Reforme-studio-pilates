import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Cliente de Supabase para el SERVIDOR (componentes de servidor y server
 * actions). Es por donde pasan todas las consultas de datos.
 *
 * ⚠️ **`cookies()` es `async` en Next 16**, de ahí que la función lo sea. Toda
 * la cadena que la use hereda el `await`: `getPlanes()`, el layout del panel y
 * las acciones de `/admin/planes`.
 */
export async function crearClienteServidor() {
  const almacen = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return almacen.getAll();
        },
        setAll(cookiesNuevas) {
          /* ⚠️ El try/catch NO es pereza: escribir cookies desde un componente
             de SERVIDOR lanza, porque a esas alturas la respuesta ya se está
             enviando. Solo pueden escribirlas las server actions y `proxy.ts`.

             Y no pasa nada por tragárselo aquí: `proxy.ts` refresca la sesión
             en cada petición, así que la cookie renovada llega igual. Sin este
             catch, cualquier página del panel reventaría al caducar el token —
             que es justo cuando el usuario menos lo entendería. */
          try {
            for (const { name, value, options } of cookiesNuevas) {
              almacen.set(name, value, options);
            }
          } catch {
            // Componente de servidor: lo arregla el proxy en la siguiente vuelta.
          }
        },
      },
    },
  );
}

/**
 * El usuario autenticado, o `null`.
 *
 * ⚠️ **`getUser()` y NUNCA `getSession()`.** `getSession()` se cree lo que
 * venga en la cookie sin comprobarlo, así que un token manipulado pasaría;
 * `getUser()` lo valida contra el servidor de Supabase. En un componente de
 * servidor —donde se decide qué datos se pintan— esa diferencia es la que
 * separa una comprobación real de una decorativa.
 */
export async function getUsuarioAutenticado() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
