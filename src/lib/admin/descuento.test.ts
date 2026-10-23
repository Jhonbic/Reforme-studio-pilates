import { describe, expect, it } from "vitest";
import { descuentoVigente, precioConDescuento, precioVigente } from "./descuento";

describe("descuentos de los planes", () => {
  it("sin porcentaje no hay descuento, aunque haya fecha", () => {
    expect(descuentoVigente(null, "2026-12-31", "2026-10-23")).toBeNull();
  });

  it("el último día todavía vale; el siguiente, ya no", () => {
    expect(descuentoVigente(20, "2026-10-31", "2026-10-31")).toEqual({ pct: 20, hasta: "2026-10-31" });
    expect(descuentoVigente(20, "2026-10-31", "2026-11-01")).toBeNull();
  });

  it("sin fecha de fin dura hasta que se quite", () => {
    expect(descuentoVigente(15, null, "2030-01-01")).toEqual({ pct: 15, hasta: null });
  });

  it("redondea al peso, como la base", () => {
    expect(precioConDescuento(260000, 15)).toBe(221000);
    expect(precioConDescuento(470000, 33)).toBe(314900);
    expect(precioConDescuento(99999, 50)).toBe(50000);
  });

  it("un descuento caducado cobra el precio de siempre", () => {
    expect(precioVigente(580000, 20, "2026-10-01", "2026-10-23")).toBe(580000);
    expect(precioVigente(580000, 20, null, "2026-10-23")).toBe(464000);
  });
});
