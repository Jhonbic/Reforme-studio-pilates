import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente de Supabase para código de SERVIDOR (layouts, páginas, server actions).
 *
 * Se crea uno por petición, nunca a nivel de módulo: lleva dentro las cookies de
 * QUIEN pregunta, y uno compartido mezclaría las sesiones de dos personas.
 *
 * ⚠️ Usa la clave anónima, no la `service_role`. Lo que esta cuenta puede leer lo
 * decide RLS con la sesión de la cookie — que es justo lo que se quiere.
 */
export async function crearClienteServidor() {
  const almacen = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => almacen.getAll(),
        setAll(lista) {
          // Desde un Server Component las cookies son de solo lectura y esto
          // lanza. No pasa nada: el refresco de la sesión lo hace `proxy.ts`
          // en cada petición, antes de llegar aquí.
          try {
            lista.forEach(({ name, value, options }) =>
              almacen.set(name, value, options),
            );
          } catch {}
        },
      },
    },
  );
}
