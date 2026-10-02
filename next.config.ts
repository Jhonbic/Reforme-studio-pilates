import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
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
