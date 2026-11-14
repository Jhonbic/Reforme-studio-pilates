import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { SECCIONES, inicioDe, puedeVer, seccionActual, seccionesDe } from "./secciones";

describe("qué ve cada rol del panel", () => {
  // Decisión del usuario (nov 2026): la instructora solo pasa lista y mira su
  // perfil. Ni fichas de clientes ni cifras del estudio.
  it("la instructora solo tiene Clases y Configuración, y entra por Clases", () => {
    expect(seccionesDe("Instructora").map((s) => s.href)).toEqual(["/admin/clases", "/admin/configuracion"]);
    expect(inicioDe("Instructora")).toBe("/admin/clases");
  });

  it("la instructora no abre el Dashboard, Usuarios ni sus fichas aunque escriba la URL", () => {
    for (const ruta of [
      "/admin",
      "/admin/usuarios",
      "/admin/usuarios/nuevo",
      "/admin/usuarios/0b7f4a2e-0000-0000-0000-000000000000",
      "/admin/usuarios/0b7f4a2e-0000-0000-0000-000000000000/editar",
      "/admin/planes",
      "/admin/finanzas",
      "/admin/estadisticas",
    ]) {
      expect(puedeVer("Instructora", ruta), ruta).toBe(false);
    }
    expect(puedeVer("Instructora", "/admin/clases")).toBe(true);
    expect(puedeVer("Instructora", "/admin/configuracion")).toBe(true);
  });

  it("Administración y Recepción siguen viendo todo y entran por el Dashboard", () => {
    for (const rol of ["Administración", "Recepción"]) {
      expect(inicioDe(rol)).toBe("/admin");
      for (const s of SECCIONES) expect(puedeVer(rol, s.href), `${rol} ${s.href}`).toBe(true);
    }
  });

  /* Red de seguridad: esconder del menú no basta, la URL se escribe a mano.
     Toda página de una sección que algún rol no ve tiene que llamar a
     `exigirSeccion` (lib/admin/acceso.ts). Una página nueva sin la puerta
     haría fallar esto. */
  it("toda página de una sección oculta a algún rol tiene su puerta", () => {
    const raiz = join(process.cwd(), "src", "app", "admin");
    const paginas = readdirSync(raiz, { recursive: true, encoding: "utf8" })
      .filter((f) => f.endsWith(`page.tsx`))
      .map((f) => join(raiz, f));
    expect(paginas.length).toBeGreaterThan(5);

    const sinPuerta = paginas.filter((archivo) => {
      const ruta =
        "/admin" +
        relative(raiz, archivo)
          .split(sep)
          .slice(0, -1)
          .map((seg) => (seg.startsWith("[") ? "x" : seg))
          .map((seg) => `/${seg}`)
          .join("");
      if (!seccionActual(ruta).ocultaA?.length) return false;
      return !readFileSync(archivo, "utf8").includes("exigirSeccion(");
    });
    expect(sinPuerta).toEqual([]);
  });
});
