import type { NextConfig } from "next";
import path from "node:path";

/**
 * Cabeceras de seguridad para todas las rutas.
 *
 * - Nadie puede meter la web (ni el panel) dentro de un iframe suyo para
 *   engañar con clics: `frame-ancestors 'none'` y, para navegadores viejos,
 *   `X-Frame-Options`. El mapa de la portada es al revés (nosotros
 *   embebemos a Google), así que no le afecta.
 * - El CSP es MÍNIMO a propósito: sin `script-src`, que obligaría a usar
 *   nonces en cada página. `form-action 'self'`: los formularios solo envían
 *   a esta web (las server actions también).
 * - Cámara, micrófono y ubicación apagados: no se usan. Elegir una foto del
 *   comprobante es un `<input type="file">` y no depende de esto.
 */
const CABECERAS_SEGURIDAD = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  // No anunciar «X-Powered-By: Next.js»: no ayuda a nadie salvo a quien busca versiones vulnerables.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: CABECERAS_SEGURIDAD }];
  },
  // Fija la raíz del workspace a esta carpeta (hay otro lockfile en el home del usuario).
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    serverActions: {
      // El comprobante de un gasto (foto o PDF de la factura) viaja dentro de
      // la server action. Por defecto Next corta en 1 MB, y una foto de móvil
      // pasa de eso. 4 MB y no más: Vercel rechaza peticiones de más de
      // 4,5 MB, y el formulario ya limita el archivo a 3,5 MB.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
