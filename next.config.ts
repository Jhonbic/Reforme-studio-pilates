import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Fija la raíz del workspace a esta carpeta (hay otro lockfile en el home del usuario).
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
