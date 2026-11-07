import "server-only";
import { createClient } from "@supabase/supabase-js";
import { aEstadoCampana, type EstadoCampana } from "@/lib/admin/campana";
import { hoyEnBogota } from "@/lib/admin/horario";
import type { Database } from "@/lib/supabase/tipos";

/**
 * La campaña de descuento de hoy para la PORTADA, o `null`.
 *
 * ⚠️ Sin cookies, a propósito: `crearClienteServidor()` lee la sesión y
 * volvería dinámica la portada, que es estática (`○`) y se regenera cada
 * minuto (`revalidate` en `app/page.tsx`). Aquí no hace falta sesión:
 * `estado_campana()` se concede a `anon` y solo devuelve cifras.
 *
 * Nunca rompe la portada: sin variables (la CI compila sin ellas) o con la
 * base caída devuelve `null` y la sección sale como siempre.
 */
export async function getCampanaPublica(): Promise<EstadoCampana | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !clave) return null;
  try {
    const supabase = createClient<Database>(url, clave, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.rpc("estado_campana", { p_fecha: hoyEnBogota() });
    if (error) {
      console.error("No se pudo leer la campaña para la portada:", error.message);
      return null;
    }
    const c = data?.[0];
    return c ? aEstadoCampana(c) : null;
  } catch (e) {
    console.error("No se pudo leer la campaña para la portada:", e);
    return null;
  }
}
