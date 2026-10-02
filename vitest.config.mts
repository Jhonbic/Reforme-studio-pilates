import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Tests unitarios de la lógica PURA (`src/**\/*.test.ts`): fechas, periodos,
 * validaciones y cálculos del dashboard. Sin navegador ni base de datos.
 *
 * Las reglas de la base (solapes, aforo, permisos de cada rol) se prueban
 * aparte, en `supabase/tests/` con pgTAP (`npx supabase test db`).
 */
export default defineConfig({
  resolve: {
    // El mismo alias que `tsconfig.json`.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
