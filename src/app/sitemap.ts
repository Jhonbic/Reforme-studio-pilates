import type { MetadataRoute } from "next";
import { URL_SITIO } from "@/lib/sitio";

/**
 * Las páginas públicas. Solo tres: la landing (lo que importa que se
 * encuentre), el registro (el CTA «Reservar mi clase») y el login.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${URL_SITIO}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${URL_SITIO}/registro`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${URL_SITIO}/login`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
