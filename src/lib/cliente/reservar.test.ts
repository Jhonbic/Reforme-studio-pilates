import { describe, expect, it } from "vitest";
import type { ClaseParaCliente } from "./datos";
import {
  cancelable,
  diaInicial,
  diasDeSemana,
  estadoParaMi,
  horasDe,
  porSala,
  semanasDeAgenda,
  textoEstado,
} from "./reservar";

// Domingo 8 de noviembre de 2026.
const HOY = "2026-11-08";
const COBERTURA = [{ inicio: "2026-11-15", vencimiento: "2026-12-14" }];

function clase(p: Partial<ClaseParaCliente> & { fecha: string }): ClaseParaCliente {
  return {
    id: `${p.fecha}-${p.horaInicio ?? "07:00"}-${p.tipo ?? "Reformer"}`,
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

describe("estado de una clase para el cliente", () => {
  const dia = "2026-11-16"; // su plan lo cubre

  it("lo suyo manda: reservada o en espera, aunque esté llena", () => {
    expect(estadoParaMi(clase({ fecha: dia, reservada: true, libres: 0 }), COBERTURA)).toBe("reservada");
    expect(estadoParaMi(clase({ fecha: dia, puestoEspera: 2, libres: 0 }), COBERTURA)).toBe("espera");
  });

  it("con cupo, plan y clases de esa modalidad, se puede reservar", () => {
    expect(estadoParaMi(clase({ fecha: dia }), COBERTURA)).toBe("disponible");
  });

  it("llena pero podría entrar: lista de espera; llena sin poder entrar: solo «Llena»", () => {
    expect(estadoParaMi(clase({ fecha: dia, libres: 0 }), COBERTURA)).toBe("llena-espera");
    expect(estadoParaMi(clase({ fecha: dia, libres: 0, disponibles: 0 }), COBERTURA)).toBe("llena");
    expect(estadoParaMi(clase({ fecha: "2026-11-10", libres: 0 }), COBERTURA)).toBe("llena");
  });

  it("el plan cubre el día de la CLASE, no hoy: antes del 15 nov no tiene plan", () => {
    expect(estadoParaMi(clase({ fecha: "2026-11-10" }), COBERTURA)).toBe("sin-plan");
  });

  it("sin clases de esa modalidad y privadas, con su porqué", () => {
    const sinMat = clase({ fecha: dia, tipo: "Mat", disponibles: 0 });
    expect(estadoParaMi(sinMat, COBERTURA)).toBe("sin-clases");
    expect(textoEstado("sin-clases", sinMat)).toBe("Sin clases de Mat");
    expect(estadoParaMi(clase({ fecha: dia, tipo: "Privada", disponibles: null }), COBERTURA)).toBe("privada");
  });

  it("los textos cuentan los cupos y el puesto", () => {
    expect(textoEstado("disponible", clase({ fecha: dia, libres: 1 }))).toBe("1 libre");
    expect(textoEstado("espera", clase({ fecha: dia, puestoEspera: 3 }))).toBe("En espera · 3.º");
  });
});

describe("plazo para cancelar", () => {
  it("cuenta los días: con 24 h, mañana a las 07:00 ya no se cancela hoy a las 08:00", () => {
    const manana = { fecha: "2026-11-09", horaInicio: "07:00" };
    expect(cancelable(manana, HOY, 8 * 60, 24)).toBe(false);
    expect(cancelable(manana, HOY, 6 * 60, 24)).toBe(true);
    expect(cancelable({ fecha: HOY, horaInicio: "18:00" }, HOY, 16 * 60, 2)).toBe(false);
  });
});

describe("semanas, días y horas", () => {
  it("de la semana de hoy a la del último día con clases", () => {
    // Hoy domingo: su semana empieza el lunes 2. La agenda llega al 22.
    expect(semanasDeAgenda(HOY, [clase({ fecha: "2026-11-16" }), clase({ fecha: "2026-11-22" })])).toEqual([
      "2026-11-02",
      "2026-11-09",
      "2026-11-16",
    ]);
    expect(semanasDeAgenda(HOY, [])).toEqual(["2026-11-02"]);
  });

  it("los siete días de la semana, de lunes a domingo", () => {
    expect(diasDeSemana("2026-11-16")).toEqual([
      "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22",
    ]);
  });

  it("horas sin repetir y en orden; Reformer antes que Mat", () => {
    const clases = [
      clase({ fecha: HOY, horaInicio: "18:00" }),
      clase({ fecha: HOY, horaInicio: "07:00", tipo: "Mat" }),
      clase({ fecha: HOY, horaInicio: "07:00" }),
    ];
    expect(horasDe(clases)).toEqual(["07:00", "18:00"]);
    expect([...clases].sort(porSala).map((c) => c.tipo)).toEqual(["Reformer", "Reformer", "Mat"]);
  });

  it("abre hoy si hay clases; si no, el primer día en que puede reservar", () => {
    const agenda = [clase({ fecha: "2026-11-10" }), clase({ fecha: "2026-11-16" })];
    expect(diaInicial(HOY, agenda, COBERTURA)).toBe("2026-11-16");
    expect(diaInicial(HOY, [clase({ fecha: HOY }), ...agenda], COBERTURA)).toBe(HOY);
    expect(diaInicial(HOY, [], COBERTURA)).toBe(HOY);
  });
});
