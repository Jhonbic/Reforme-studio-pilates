import { describe, expect, it } from "vitest";
import {
  altasYBajas,
  indicadores,
  repartoMetodos,
  repartoPlanes,
  serieMensual,
  tasaRenovacion,
  type DatosDashboard,
} from "./dashboard";

const hoy = "2026-10-15";

/** Un estudio mínimo, a mano, para comprobar cada cifra. */
function datos(parcial: Partial<DatosDashboard> = {}): DatosDashboard {
  return {
    pagos: [],
    gastos: [],
    presupuestos: [],
    vigentes: [],
    altas: [],
    membresias: [],
    ...parcial,
  };
}

describe("cifras de cabecera", () => {
  it("ingresos y utilidad del mes en curso", () => {
    const [ingresos, utilidad] = indicadores(
      datos({
        pagos: [
          { fecha: "2026-10-03", importe: 190_000, metodo: "Nequi", plan: "Mensual" },
          { fecha: "2026-09-20", importe: 999_999, metodo: "Nequi", plan: "Mensual" },
        ],
        gastos: [{ fecha: "2026-10-01", importe: 50_000, categoria: "Servicios" }],
      }),
      hoy,
    );
    expect(ingresos.valor).toBe(190_000);
    expect(utilidad.valor).toBe(140_000);
  });

  it("sin base positiva no hay variación (con una utilidad anterior negativa saldría al revés)", () => {
    const [, utilidad] = indicadores(
      datos({
        pagos: [{ fecha: "2026-10-03", importe: 100, metodo: "Nequi", plan: "Mensual" }],
        gastos: [{ fecha: "2026-09-03", importe: 500, categoria: "Arriendo" }],
      }),
      hoy,
    );
    expect(utilidad.variacion).toBeNull();
  });

  it("clientes activos = membresía vigente hoy; por vencer = vence en ≤ 7 días", () => {
    const [, , activos, porVencer] = indicadores(
      datos({
        membresias: [
          { clienteId: "a", inicio: "2026-10-01", vencimiento: "2026-10-31" },
          { clienteId: "b", inicio: "2026-09-01", vencimiento: "2026-10-01" },
        ],
        vigentes: [
          { plan: "Mensual", estado: "Por vencer", vencimiento: "2026-10-20", importeRenovacion: 190_000 },
          { plan: "Mensual", estado: "Activa", vencimiento: "2026-11-30", importeRenovacion: 190_000 },
        ],
      }),
      hoy,
    );
    expect(activos.valor).toBe(1);
    expect(porVencer.valor).toBe(190_000);
  });
});

describe("repartos", () => {
  it("más de 4 planes: la 5ª porción se agrupa en «Otros» (la paleta tiene 4 colores)", () => {
    const pagos = ["A", "B", "C", "D", "E"].map((plan, i) => ({
      fecha: "2026-10-10",
      importe: 100 * (5 - i),
      metodo: "Nequi" as const,
      plan,
    }));
    const r = repartoPlanes(datos({ pagos }), hoy);
    expect(r).toHaveLength(4);
    expect(r[3]).toMatchObject({ plan: "Otros", importe: 300 });
  });

  it("salen los cuatro métodos aunque alguno sea cero", () => {
    expect(repartoMetodos(datos(), hoy)).toHaveLength(4);
  });

  it("la serie trae doce meses aunque estén a cero", () => {
    const s = serieMensual(datos(), hoy);
    expect(s).toHaveLength(12);
    expect(s[11]).toMatchObject({ mes: "Oct", anio: 2026 });
    expect(s[0]).toMatchObject({ mes: "Nov", anio: 2025 });
  });
});

describe("altas, bajas y renovación", () => {
  it("renovar NO es una baja: solo cuenta la ÚLTIMA membresía vencida", () => {
    const m = [
      { clienteId: "renueva", inicio: "2026-08-01", vencimiento: "2026-08-31" },
      { clienteId: "renueva", inicio: "2026-09-01", vencimiento: "2026-11-30" },
      { clienteId: "se-va", inicio: "2026-08-01", vencimiento: "2026-09-10" },
    ];
    const serie = altasYBajas(datos({ membresias: m }), hoy);
    const bajas = serie.reduce((t, x) => t + x.bajas, 0);
    expect(bajas).toBe(1);
  });

  it("sin vencimientos en la ventana la tasa es «—» (null), no 0 %", () => {
    expect(tasaRenovacion(datos(), hoy).valor).toBeNull();
  });

  it("de dos vencidas en 30 días, una renovada → 50 %", () => {
    const m = [
      { clienteId: "a", inicio: "2026-09-01", vencimiento: "2026-10-01" },
      { clienteId: "a", inicio: "2026-10-02", vencimiento: "2026-11-01" },
      { clienteId: "b", inicio: "2026-09-05", vencimiento: "2026-10-05" },
    ];
    expect(tasaRenovacion(datos({ membresias: m }), hoy).valor).toBe(50);
  });
});
