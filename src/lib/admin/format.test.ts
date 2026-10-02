import { describe, expect, it } from "vitest";
import { calcularVariacion, documento, fecha, telefonoCO, variacion } from "./format";

describe("formato", () => {
  it("la cédula se agrupa con puntos sin pasar por Number (no pierde ceros)", () => {
    expect(documento("1045678912")).toBe("1.045.678.912");
    expect(documento("0012345")).toBe("0.012.345");
  });

  it("teléfono para pintar", () => {
    expect(telefonoCO("3209078814")).toBe("+57 320 907 8814");
    // Lo que no es un móvil de 10 dígitos se deja tal cual.
    expect(telefonoCO("123")).toBe("123");
  });

  it("una fecha ISO no se corre al día anterior en Colombia (UTC−5)", () => {
    expect(fecha("2026-07-25")).toContain("25");
    expect(fecha("2026-01-01", true)).toContain("2026");
  });

  it("variación con signo explícito, y sin base no hay variación", () => {
    expect(variacion(12.4)).toBe("+12,4 %");
    expect(variacion(-3.1)).toBe("−3,1 %");
    expect(calcularVariacion(110, 100)).toBeCloseTo(10);
    expect(calcularVariacion(50, 0)).toBeNull();
  });
});
