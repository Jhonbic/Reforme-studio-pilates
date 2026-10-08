import { expect, it } from "vitest";
import { salaDeClase } from "./salas";

it("Reformer y Mat van siempre en su sala; la privada, en la que se elija", () => {
  expect(salaDeClase("Mat", "Reformer")).toBe("Mat");
  expect(salaDeClase("Reformer", "Mat")).toBe("Reformer");
  expect(salaDeClase("Privada", "Mat")).toBe("Mat");
});

it("cuandoEs mete el día en una frase sin «el mañana»", async () => {
  const { cuandoEs } = await import("./horario");
  expect(cuandoEs("2026-10-08", "2026-10-07")).toBe("mañana");
  expect(cuandoEs("2026-10-07", "2026-10-07")).toBe("hoy");
  expect(cuandoEs("2026-10-10", "2026-10-07")).toMatch(/^el sábado/);
});
