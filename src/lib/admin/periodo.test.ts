import { describe, expect, it } from "vitest";
import {
  enPeriodo,
  esteMes,
  etiquetaPeriodo,
  mesAnterior,
  mesesDe,
  periodoAnterior,
  periodoDeMes,
} from "./periodo";

describe("periodos de Finanzas", () => {
  const hoy = "2026-10-01";

  it("el mes en curso va del 1 a HOY, no al 31", () => {
    expect(esteMes(hoy)).toEqual({ desde: "2026-10-01", hasta: "2026-10-01" });
  });

  it("el mes anterior es el mes entero", () => {
    expect(mesAnterior(hoy)).toEqual({ desde: "2026-09-01", hasta: "2026-09-30" });
    expect(mesAnterior("2026-01-15")).toEqual({ desde: "2025-12-01", hasta: "2025-12-31" });
  });

  it("se compara con el MISMO TRAMO del mes anterior, no con el mes entero", () => {
    // El 1 de octubre se compara con el 1 de septiembre (si no, «▼ −97 %»).
    expect(periodoAnterior(esteMes(hoy))).toEqual({ desde: "2026-09-01", hasta: "2026-09-01" });
    expect(periodoAnterior({ desde: "2026-03-01", hasta: "2026-03-15" })).toEqual({
      desde: "2026-02-01",
      hasta: "2026-02-15",
    });
  });

  it("un mes entero se compara con el anterior ENTERO (fallo encontrado: daba 1–30 ago)", () => {
    expect(periodoAnterior({ desde: "2026-09-01", hasta: "2026-09-30" })).toEqual({
      desde: "2026-08-01",
      hasta: "2026-08-31",
    });
    expect(periodoAnterior({ desde: "2026-03-01", hasta: "2026-03-31" })).toEqual({
      desde: "2026-02-01",
      hasta: "2026-02-28",
    });
    expect(periodoAnterior({ desde: "2026-01-01", hasta: "2026-01-31" })).toEqual({
      desde: "2025-12-01",
      hasta: "2025-12-31",
    });
  });

  it("un rango libre se compara con los mismos días justo antes", () => {
    expect(periodoAnterior({ desde: "2026-08-20", hasta: "2026-09-05" })).toEqual({
      desde: "2026-08-03",
      hasta: "2026-08-19",
    });
  });

  it("un mes ya pasado no se recorta; el en curso, sí", () => {
    expect(periodoDeMes(2026, 8, hoy)).toEqual({ desde: "2026-09-01", hasta: "2026-09-30" });
    expect(periodoDeMes(2026, 9, "2026-10-12")).toEqual({ desde: "2026-10-01", hasta: "2026-10-12" });
  });

  it("los meses que toca un periodo, cruzando de año", () => {
    expect(mesesDe({ desde: "2025-11-10", hasta: "2026-02-02" })).toEqual([
      "2025-11-01",
      "2025-12-01",
      "2026-01-01",
      "2026-02-01",
    ]);
  });

  it("enPeriodo incluye los dos extremos", () => {
    const p = { desde: "2026-09-01", hasta: "2026-09-30" };
    expect(enPeriodo("2026-09-01", p)).toBe(true);
    expect(enPeriodo("2026-09-30", p)).toBe(true);
    expect(enPeriodo("2026-10-01", p)).toBe(false);
  });

  it("etiquetas: mes, trozo de mes y rango", () => {
    expect(etiquetaPeriodo(esteMes(hoy), hoy)).toBe("octubre 2026");
    expect(etiquetaPeriodo({ desde: "2026-09-01", hasta: "2026-09-01" }, hoy)).toBe("1 sep 2026");
    expect(etiquetaPeriodo({ desde: "2026-09-01", hasta: "2026-09-15" }, hoy)).toBe("1 – 15 sep 2026");
    expect(etiquetaPeriodo({ desde: "2026-08-20", hasta: "2026-09-05" }, hoy)).toBe("20 ago – 5 sep 2026");
  });
});
