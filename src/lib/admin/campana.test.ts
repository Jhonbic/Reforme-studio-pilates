import { describe, expect, it } from "vitest";
import {
  aperturaPara,
  erroresCampana,
  estadoDeCampana,
  frasesTramos,
  metaDe,
  planEnCampana,
  precioDeVenta,
  segmentosCampana,
  tieneDerechoApertura,
  type BorradorCampana,
  type EstadoCampana,
} from "./campana";

const campana: EstadoCampana = {
  id: "c",
  nombre: "Apertura",
  desde: "2026-11-10",
  hasta: "2026-11-16",
  inicioMembresias: null,
  vendidas: 18,
  meta: 80,
  tramo: { orden: 1, pct: 15, quedan: 2 },
  // «Inicio» (la clase suelta) no entra en la campaña.
  planesExcluidos: ["inicio"],
};

describe("campaña de apertura", () => {
  it("solo quien no ha comprado nunca un plan que entre tiene el descuento", () => {
    expect(aperturaPara(campana, [], "origen")).toBe(15);
    // Renovar, o quien ya tuvo un plan que entra: precio normal.
    expect(aperturaPara(campana, ["origen"], "equilibrio")).toBeNull();
  });

  it("un plan excluido no lleva descuento, y comprarlo no gasta el derecho", () => {
    expect(planEnCampana(campana, "inicio")).toBe(false);
    expect(aperturaPara(campana, [], "inicio")).toBeNull();
    // Probó con la clase suelta: al inscribirse sigue teniendo el descuento.
    expect(tieneDerechoApertura(campana, ["inicio", "inicio"])).toBe(true);
    expect(aperturaPara(campana, ["inicio"], "origen")).toBe(15);
  });

  it("con los cupos agotados, o sin campaña, no hay descuento", () => {
    expect(aperturaPara({ ...campana, tramo: null }, [], "origen")).toBeNull();
    expect(aperturaPara(null, [], "origen")).toBeNull();
    expect(tieneDerechoApertura(null, [])).toBe(false);
  });

  it("el tramo va sobre el precio de lista y no se suma al descuento del plan", () => {
    // Plan de $100.000 con su propio −20 % ($80.000 hoy): la apertura al 15 %
    // cobra $85.000, no $68.000.
    const plan = { precio: 80000, precioLista: 100000 };
    expect(precioDeVenta(plan, 15)).toBe(85000);
    expect(precioDeVenta(plan, null)).toBe(80000);
  });

  it("redondea al peso, como la base", () => {
    expect(precioDeVenta({ precio: 260000, precioLista: 260000 }, 15)).toBe(221000);
    expect(precioDeVenta({ precio: 470000, precioLista: 470000 }, 5)).toBe(446500);
  });
});


const borrador: BorradorCampana = {
  nombre: "Preinscripciones de apertura",
  desde: "2026-11-10",
  hasta: "2026-11-16",
  inicio: "",
  tramos: [
    { cupos: 20, pct: 15 },
    { cupos: 25, pct: 10 },
    { cupos: 35, pct: 5 },
  ],
  excluidos: ["inicio"],
};

describe("configurar una campaña", () => {
  it("al menos un plan a la venta tiene que entrar en la campaña", () => {
    expect(erroresCampana(borrador, "2026-11-07", true, ["inicio", "origen"])).toEqual({});
    expect(erroresCampana({ ...borrador, excluidos: ["inicio", "origen"] }, "2026-11-07", true, ["inicio", "origen"]).planes)
      .toBeDefined();
  });

  it("la del estudio es válida y su meta es 80", () => {
    expect(erroresCampana(borrador, "2026-11-07", true)).toEqual({});
    expect(metaDe(borrador.tramos)).toBe(80);
  });

  it("una nueva no empieza en el pasado; una que ya empezó se puede editar", () => {
    expect(erroresCampana(borrador, "2026-11-12", true).desde).toBeDefined();
    expect(erroresCampana(borrador, "2026-11-12", false)).toEqual({});
  });

  it("el último día no puede ir antes del primero ni haber pasado", () => {
    expect(erroresCampana({ ...borrador, hasta: "2026-11-09" }, "2026-11-07", true).hasta).toBeDefined();
    expect(erroresCampana(borrador, "2026-11-17", false).hasta).toBeDefined();
  });

  it("el inicio de las membresías no va antes de la campaña", () => {
    expect(erroresCampana({ ...borrador, inicio: "2026-11-09" }, "2026-11-07", true).inicio).toBeDefined();
    expect(erroresCampana({ ...borrador, inicio: "2026-11-20" }, "2026-11-07", true)).toEqual({});
  });

  it("sin tramos, o con un tramo vacío, no se guarda", () => {
    expect(erroresCampana({ ...borrador, tramos: [] }, "2026-11-07", true).tramos).toBeDefined();
    expect(
      erroresCampana({ ...borrador, tramos: [{ cupos: 0, pct: 15 }] }, "2026-11-07", true).tramos,
    ).toBeDefined();
  });

  it("estado según las fechas: el último día todavía está en curso", () => {
    expect(estadoDeCampana(borrador, "2026-11-09")).toBe("Programada");
    expect(estadoDeCampana(borrador, "2026-11-16")).toBe("En curso");
    expect(estadoDeCampana(borrador, "2026-11-17")).toBe("Terminada");
  });

  it("una campaña cerrada a mano está terminada aunque sus fechas sigan", () => {
    expect(estadoDeCampana({ ...borrador, cerrada: true }, "2026-11-12")).toBe("Terminada");
  });

  it("describe los tramos en una frase", () => {
    expect(frasesTramos(borrador.tramos)).toBe(
      "las primeras 20 al 15 %, las siguientes 25 al 10 % y las siguientes 35 al 5 %",
    );
    expect(frasesTramos([{ cupos: 10, pct: 20 }])).toBe("las primeras 10 al 20 %");
  });
});

describe("barra de la campaña en el dashboard", () => {
  const tramos = [
    { cupos: 20, pct: 15 },
    { cupos: 25, pct: 10 },
    { cupos: 35, pct: 5 },
  ];

  it("reparte lo vendido en orden y marca el tramo en curso", () => {
    expect(segmentosCampana(tramos, 34)).toEqual([
      { pct: 15, cupos: 20, llenos: 20, actual: false },
      { pct: 10, cupos: 25, llenos: 14, actual: true },
      { pct: 5, cupos: 35, llenos: 0, actual: false },
    ]);
  });

  it("justo al llenar un tramo, el en curso es el siguiente", () => {
    expect(segmentosCampana(tramos, 20).map((s) => s.actual)).toEqual([false, true, false]);
  });

  it("agotada, ningún tramo está en curso", () => {
    expect(segmentosCampana(tramos, 80).some((s) => s.actual)).toBe(false);
    expect(segmentosCampana(tramos, 80).every((s) => s.llenos === s.cupos)).toBe(true);
  });
});
