import { describe, expect, it } from "vitest";
import { moneda } from "@/lib/admin/format";
import { beneficiosDe, pestanaInicial } from "./planes";

describe("lo que incluye un plan", () => {
  it("las clases de cada tipo, el precio por clase y las características", () => {
    expect(beneficiosDe({ clasesReformer: 8, clasesMat: 4, caracteristicas: [" Toalla incluida ", ""] }, 600000)).toEqual([
      "8 clases de Reformer",
      "4 clases de Mat",
      `${moneda(50000)} por clase`,
      "Toalla incluida",
    ]);
  });

  it("un plan de una sola modalidad no dice «0 de la otra»", () => {
    expect(beneficiosDe({ clasesReformer: 0, clasesMat: 1, caracteristicas: [] }, 40000)).toEqual([
      "1 clase de Mat",
      `${moneda(40000)} por clase`,
    ]);
  });
});

describe("pestaña que se abre al entrar", () => {
  const planes = [
    { nombre: "Origen", modalidad: "Mat" as const, destacado: false },
    { nombre: "Equilibrio", modalidad: "Reformer" as const, destacado: false },
    { nombre: "Fusión Esencial", modalidad: "Fusión" as const, destacado: true },
  ];

  it("la de su plan (viene a renovar), luego la del destacado", () => {
    expect(pestanaInicial(planes, "Equilibrio")).toBe("Reformer");
    expect(pestanaInicial(planes, null)).toBe("Fusión");
    // Un plan que ya no se vende no cuenta.
    expect(pestanaInicial(planes, "Plan retirado")).toBe("Fusión");
  });

  it("sin destacado, la primera modalidad con planes", () => {
    expect(pestanaInicial(planes.map((p) => ({ ...p, destacado: false })).slice(1), null)).toBe("Reformer");
    expect(pestanaInicial([], null)).toBe("Mat");
  });
});
