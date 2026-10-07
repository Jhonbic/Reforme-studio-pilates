import { expect, it } from "vitest";
import { salaDeClase } from "./salas";

it("Reformer y Mat van siempre en su sala; la privada, en la que se elija", () => {
  expect(salaDeClase("Mat", "Reformer")).toBe("Mat");
  expect(salaDeClase("Reformer", "Mat")).toBe("Reformer");
  expect(salaDeClase("Privada", "Mat")).toBe("Mat");
});
