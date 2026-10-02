/**
 * La URL pública del sitio, para `robots`, `sitemap` y las URL absolutas de la
 * imagen para compartir (WhatsApp y las redes las piden absolutas).
 *
 * ⚠️ Cuando el dominio propio (reformestudiopilates.com) apunte a Vercel, se
 * fija `NEXT_PUBLIC_SITE_URL` en Vercel y no hay que tocar código. Mientras
 * tanto, la URL de producción de Vercel: las otras dos (rama y hash) piden
 * iniciar sesión y una vista previa de WhatsApp no podría leerlas.
 */
export const URL_SITIO = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://reforme-studio-pilates.vercel.app"
).replace(/\/$/, "");
