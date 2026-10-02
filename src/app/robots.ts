import type { MetadataRoute } from "next";
import { URL_SITIO } from "@/lib/sitio";

/**
 * Qué pueden rastrear los buscadores.
 *
 * Fuera el panel y el área de cliente: no hay nada que indexar detrás de un
 * login (y sus páginas ya llevan `noindex`). Esto NO es seguridad —un
 * `robots.txt` es una petición educada, no una puerta—: lo que protege esas
 * rutas es `proxy.ts`, el layout de cada una y RLS.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/mi-cuenta"] },
    sitemap: `${URL_SITIO}/sitemap.xml`,
  };
}
