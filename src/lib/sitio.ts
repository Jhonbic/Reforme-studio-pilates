/**
 * La URL pública del sitio, para `robots`, `sitemap` y las URL absolutas de la
 * imagen para compartir (WhatsApp y las redes las piden absolutas).
 *
 * El dominio propio apunta a Vercel desde el 23 oct 2026, con el `www` como
 * principal (la versión sin `www` redirige ahí). `NEXT_PUBLIC_SITE_URL` sigue
 * pudiendo cambiarla sin tocar código.
 */
export const URL_SITIO = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.reformestudiopilates.com"
).replace(/\/$/, "");
