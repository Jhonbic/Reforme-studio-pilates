import { describe, expect, it } from "vitest";
import { puedeMarcarAsistencia, resumenAsistencia } from "./asistencia";
import type { ClaseEnAgenda } from "./types";

const clase = (p: Partial<ClaseEnAgenda> = {}): ClaseEnAgenda => ({
  id: "c1",
  tipo: "Mat",
  fecha: "2026-10-05",
  horaInicio: "07:00",
  duracionMin: 50,
  instructoraId: "ana",
  cupos: 8,
  reservas: 2,
  cancelada: false,
  instructora: "Ana",
  horaFin: "07:50",
  estado: "Finalizada",
  libres: 6,
  empezada: true,
  sala: "Reformer",
  reservados: [],
  ...p,
});

describe("puedeMarcarAsistencia", () => {
  it("la instructora marca SUS clases y no las de otra: las demás no estaban", () => {
    expect(puedeMarcarAsistencia(clase(), false, "ana")).toBe(true);
    expect(puedeMarcarAsistencia(clase(), false, "luisa")).toBe(false);
    expect(puedeMarcarAsistencia(clase(), false, null)).toBe(false);
  });

  it("el mostrador marca cualquier clase", () => {
    expect(puedeMarcarAsistencia(clase(), true, null)).toBe(true);
  });

  it("antes de empezar no hay asistencia que marcar, ni en una cancelada", () => {
    expect(puedeMarcarAsistencia(clase({ empezada: false, estado: "Programada" }), true, null)).toBe(false);
    expect(puedeMarcarAsistencia(clase({ cancelada: true, estado: "Cancelada" }), true, null)).toBe(false);
  });

  it("una clase en curso (empezada, aún no «Finalizada») ya se puede marcar", () => {
    expect(puedeMarcarAsistencia(clase({ estado: "Programada" }), false, "ana")).toBe(true);
  });
});

it("resumenAsistencia separa lo marcado de lo pendiente: sin marcar no es una falta", () => {
  const r = (id: string, asistencia: "Asistió" | "No vino" | null) => ({ id, clienteId: id, nombre: id, asistencia });
  expect(resumenAsistencia([r("a", "Asistió"), r("b", "No vino"), r("c", null), r("d", "Asistió")])).toEqual({
    asistio: 2,
    noVino: 1,
    sinMarcar: 1,
  });
});
