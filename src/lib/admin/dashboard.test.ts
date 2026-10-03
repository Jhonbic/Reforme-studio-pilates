import { describe, expect, it } from "vitest";
import {
  activosPorMes,
  cumpleanosDeHoy,
  porVencer,
  resumenClases,
  resumenClientes,
  serieMensual,
  tasaRenovacion,
  type ClienteResumen,
  type DatosDashboard,
} from "./dashboard";
import type { ClaseEnAgenda } from "./types";

const hoy = "2026-10-15";

/** Un estudio mínimo, a mano, para comprobar cada cifra. */
function datos(parcial: Partial<DatosDashboard> = {}): DatosDashboard {
  return { clientes: [], membresias: [], ...parcial };
}

function cliente(parcial: Partial<ClienteResumen>): ClienteResumen {
  return {
    id: "x",
    nombre: "Laura Gómez",
    telefono: "3001112233",
    plan: "Mensual",
    estado: "Activa",
    vencimiento: "2026-11-30",
    nacimiento: null,
    ...parcial,
  };
}

describe("cifras de clientes", () => {
  it("activos = membresía vigente hoy, comparados con hace 30 días", () => {
    const r = resumenClientes(
      datos({
        membresias: [
          { clienteId: "a", inicio: "2026-10-01", vencimiento: "2026-10-31" },
          { clienteId: "b", inicio: "2026-09-01", vencimiento: "2026-10-01" },
        ],
      }),
      hoy,
    );
    expect(r.activos).toBe(1);
    expect(r.activosHace30).toBe(1); // el 15 sep solo estaba «b»
  });

  it("recuperables: vencieron hace MENOS de 30 días; los de antes ya no", () => {
    const r = resumenClientes(
      datos({
        clientes: [
          cliente({ id: "1", estado: "Vencida", vencimiento: "2026-10-01" }),
          cliente({ id: "2", estado: "Vencida", vencimiento: "2026-08-01" }),
          cliente({ id: "3", estado: "Sin plan", vencimiento: null }),
        ],
      }),
      hoy,
    );
    expect(r.recuperables).toBe(1);
    expect(r.sinPlan).toBe(1);
  });
});

describe("listas de trabajo", () => {
  it("por vencer: de hoy a 7 días, lo más urgente primero; quien ya venció no sale", () => {
    const lista = porVencer(
      datos({
        clientes: [
          cliente({ id: "lejos", nombre: "B", vencimiento: "2026-10-20" }),
          cliente({ id: "hoy", nombre: "A", vencimiento: "2026-10-15" }),
          cliente({ id: "fuera", vencimiento: "2026-10-30" }),
          cliente({ id: "vencida", estado: "Vencida", vencimiento: "2026-10-14" }),
        ],
      }),
      hoy,
    );
    expect(lista.map((c) => c.id)).toEqual(["hoy", "lejos"]);
    expect(lista[0].dias).toBe(0);
    expect(lista[1].dias).toBe(5);
  });

  it("cumpleaños de hoy con la edad que cumple", () => {
    const lista = cumpleanosDeHoy(
      datos({
        clientes: [
          cliente({ id: "si", nacimiento: "1990-10-15" }),
          cliente({ id: "no", nacimiento: "1990-10-16" }),
        ],
      }),
      hoy,
    );
    expect(lista).toEqual([expect.objectContaining({ id: "si", edad: 36 })]);
  });

  it("quien nació un 29 de febrero sale el 28 en un año no bisiesto", () => {
    const d = datos({ clientes: [cliente({ nacimiento: "2000-02-29" })] });
    expect(cumpleanosDeHoy(d, "2027-02-28")).toHaveLength(1);
    expect(cumpleanosDeHoy(d, "2028-02-28")).toHaveLength(0);
    expect(cumpleanosDeHoy(d, "2028-02-29")).toHaveLength(1);
  });
});

describe("series", () => {
  it("activos por mes: doce meses, el último a hoy", () => {
    const s = activosPorMes(
      datos({ membresias: [{ clienteId: "a", inicio: "2026-09-10", vencimiento: "2026-12-31" }] }),
      hoy,
    );
    expect(s).toHaveLength(12);
    expect(s[11]).toMatchObject({ mes: "Oct", anio: 2026, activos: 1 });
    expect(s[10]).toMatchObject({ mes: "Sep", activos: 1 }); // vigente el 30 sep
    expect(s[9]).toMatchObject({ mes: "Ago", activos: 0 });
  });

  it("la serie de dinero trae doce meses aunque estén a cero", () => {
    const s = serieMensual({ pagos: [], gastos: [] }, hoy);
    expect(s).toHaveLength(12);
    expect(s[11]).toMatchObject({ mes: "Oct", anio: 2026 });
    expect(s[0]).toMatchObject({ mes: "Nov", anio: 2025 });
  });
});

describe("renovación", () => {
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

describe("clases", () => {
  function clase(parcial: Partial<ClaseEnAgenda>): ClaseEnAgenda {
    return {
      id: "c",
      tipo: "Reformer",
      fecha: hoy,
      horaInicio: "07:00",
      horaFin: "07:50",
      duracionMin: 50,
      instructoraId: "i",
      instructora: "Daniela",
      cupos: 8,
      reservas: 4,
      libres: 4,
      cancelada: false,
      estado: "Programada",
      reservados: [],
      ...parcial,
    };
  }

  it("la ocupación solo cuenta clases que YA pasaron y no canceladas", () => {
    const r = resumenClases(
      [
        clase({ id: "1", fecha: "2026-10-10", reservas: 8, estado: "Finalizada" }),
        clase({ id: "2", fecha: "2026-10-10", reservas: 0, estado: "Cancelada", cancelada: true }),
        clase({ id: "3", fecha: "2026-10-16", reservas: 0 }),
      ],
      hoy,
    );
    expect(r.ocupacion30).toBe(100);
    expect(r.promedio30).toBe(8);
  });

  it("sin clases pasadas la ocupación es «—» (null), no 0 %", () => {
    expect(resumenClases([], hoy).ocupacion30).toBeNull();
  });

  it("las de hoy salen en orden de hora, canceladas incluidas; las cifras no las cuentan", () => {
    const r = resumenClases(
      [
        clase({ id: "tarde", horaInicio: "18:00" }),
        clase({ id: "temprano", horaInicio: "07:00" }),
        clase({ id: "anulada", horaInicio: "09:00", cancelada: true, estado: "Cancelada" }),
      ],
      hoy,
    );
    expect(r.deHoy.map((c) => c.id)).toEqual(["temprano", "anulada", "tarde"]);
    expect(r.hoy.clases).toBe(2);
  });
});
