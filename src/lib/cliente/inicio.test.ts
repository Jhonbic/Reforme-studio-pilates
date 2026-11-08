import { describe, expect, it } from "vitest";
import type { ClasePasada, ClaseParaCliente } from "./datos";
import {
  calendarioMes,
  conCupoParaMi,
  faltaPara,
  moverMes,
  tomadasEnMes,
  vigenciaPlan,
} from "./inicio";

// Domingo 8 de noviembre de 2026.
const HOY = "2026-11-08";

function clase(p: Partial<ClaseParaCliente> & { fecha: string }): ClaseParaCliente {
  return {
    id: `${p.fecha}-${p.horaInicio ?? "07:00"}`,
    tipo: "Reformer",
    horaInicio: "07:00",
    horaFin: "07:50",
    instructora: "Ana",
    libres: 3,
    reservada: false,
    disponibles: 4,
    puestoEspera: null,
    ...p,
  };
}

function pasada(fecha: string, asistencia: ClasePasada["asistencia"] = "Asistió", cancelada = false): ClasePasada {
  return { fecha, horaInicio: "07:00", tipo: "Mat", instructora: "Ana", asistencia, cancelada };
}

describe("vigencia del plan", () => {
  it("un plan pagado que aún no empieza dice cuánto falta, no «vigente»", () => {
    // El caso que salió en local: pagó el 15 nov – 14 dic y la tarjeta decía
    // «Vigente hasta el 14 dic» sin más.
    expect(vigenciaPlan("2026-11-15", "2026-12-14", HOY)).toEqual({
      tipo: "por-empezar",
      diasParaEmpezar: 7,
      dias: 30,
    });
  });

  it("el primer día ya cuenta como usado y el último deja la barra llena", () => {
    const primero = vigenciaPlan(HOY, "2026-12-07", HOY);
    expect(primero).toMatchObject({ tipo: "en-curso", diasRestantes: 29, dias: 30 });
    expect(primero?.tipo === "en-curso" && primero.transcurrido).toBeCloseTo(1 / 30);

    expect(vigenciaPlan("2026-10-10", HOY, HOY)).toMatchObject({ diasRestantes: 0, transcurrido: 1 });
  });

  it("vencido o sin fechas no hay barra: la tarjeta habla de renovar", () => {
    expect(vigenciaPlan("2026-10-01", "2026-11-07", HOY)).toBeNull();
    expect(vigenciaPlan(null, null, HOY)).toBeNull();
  });
});

describe("con cupo para ti", () => {
  const cobertura = [{ inicio: "2026-11-01", vencimiento: "2026-11-30" }];

  it("solo ofrece lo que de verdad se puede reservar con un toque", () => {
    const agenda = [
      clase({ fecha: "2026-11-09", horaInicio: "07:00", reservada: true }),
      clase({ fecha: "2026-11-09", horaInicio: "08:00", libres: 0 }),
      clase({ fecha: "2026-11-09", horaInicio: "09:00", disponibles: 0 }),
      clase({ fecha: "2026-11-09", horaInicio: "10:00", tipo: "Privada", disponibles: null }),
      clase({ fecha: "2026-11-09", horaInicio: "15:00", puestoEspera: 2 }),
      clase({ fecha: "2026-12-01", horaInicio: "07:00" }), // su plan no cubre ese día
      clase({ fecha: "2026-11-10", horaInicio: "07:00" }),
    ];
    expect(conCupoParaMi(agenda, cobertura).map((c) => c.id)).toEqual(["2026-11-10-07:00"]);
  });

  it("como mucho tres, las más cercanas", () => {
    const agenda = ["07:00", "08:00", "09:00", "10:00"].map((h) => clase({ fecha: "2026-11-09", horaInicio: h }));
    expect(conCupoParaMi(agenda, cobertura)).toHaveLength(3);
  });
});

describe("falta para la clase", () => {
  it("solo para hoy, en minutos o en horas", () => {
    expect(faltaPara({ fecha: HOY, horaInicio: "17:00" }, HOY, 16 * 60 + 20)).toBe("Empieza en 40 min");
    expect(faltaPara({ fecha: HOY, horaInicio: "19:00" }, HOY, 15 * 60 + 10)).toBe("Empieza en 3 h");
    expect(faltaPara({ fecha: "2026-11-09", horaInicio: "07:00" }, HOY, 0)).toBeNull();
  });
});

describe("calendario del mes", () => {
  it("empieza en lunes y rellena con huecos", () => {
    // El 1 de noviembre de 2026 es domingo: seis huecos delante.
    const semanas = calendarioMes("2026-11", HOY, [], []);
    expect(semanas[0].slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(semanas[0][6]?.fecha).toBe("2026-11-01");
    expect(semanas.every((s) => s.length === 7)).toBe(true);
  });

  it("un día con varias clases enseña la más importante, y la cancelada no cuenta", () => {
    const semanas = calendarioMes(
      "2026-11",
      HOY,
      [pasada("2026-11-02", null), pasada("2026-11-03", "No vino"), pasada("2026-11-03", "Asistió"), pasada("2026-11-04", null, true)],
      [clase({ fecha: "2026-11-10", reservada: true })],
    );
    const dia = (f: string) => semanas.flat().find((c) => c?.fecha === f);
    expect(dia("2026-11-02")).toMatchObject({ marca: "sin-marcar", clases: 1 });
    expect(dia("2026-11-03")).toMatchObject({ marca: "asistio", clases: 2 });
    expect(dia("2026-11-04")).toMatchObject({ marca: null, clases: 0 });
    expect(dia("2026-11-10")?.marca).toBe("proxima");
    expect(dia(HOY)?.esHoy).toBe(true);
  });

  it("moverMes cruza el año", () => {
    expect(moverMes("2026-12", 1)).toBe("2027-01");
    expect(moverMes("2026-01", -1)).toBe("2025-12");
    expect(moverMes("2026-11", -6)).toBe("2026-05");
  });

  it("sin marcar cuenta como tomada; «No vino» y canceladas no", () => {
    const historial = [pasada("2026-11-02"), pasada("2026-11-03", null), pasada("2026-11-04", "No vino"), pasada("2026-11-05", "Asistió", true), pasada("2026-10-30")];
    expect(tomadasEnMes("2026-11", historial)).toBe(2);
  });
});
