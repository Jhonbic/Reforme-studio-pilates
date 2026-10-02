import { describe, expect, it } from "vitest";
import {
  claveNombre,
  edad,
  esCorreo,
  esMovilCO,
  normalizar,
  normalizarTelefonoPegado,
  sinDigitos,
  soloDigitos,
} from "./validacion";

describe("edad", () => {
  it("cumplir 18 HOY ya es ser mayor de edad (la regla legal)", () => {
    expect(edad("2008-10-02", "2026-10-02")).toBe(18);
    expect(edad("2008-10-03", "2026-10-02")).toBe(17);
  });

  it("compara mes y día, no milisegundos (fallaba con bisiestos)", () => {
    expect(edad("2008-02-29", "2026-02-28")).toBe(17);
    expect(edad("2008-02-29", "2026-03-01")).toBe(18);
  });

  it("una fecha mal formada no es una edad", () => {
    expect(edad("", "2026-10-02")).toBeNull();
  });
});

describe("teléfonos", () => {
  it("móvil colombiano: 10 dígitos que empiezan por 3", () => {
    expect(esMovilCO("3209078814")).toBe(true);
    expect(esMovilCO("6012345678")).toBe(false);
    expect(esMovilCO("320907881")).toBe(false);
  });

  it("pegar «+57 320 907 8814» deja los 10 dígitos", () => {
    expect(normalizarTelefonoPegado("+57 320 907 8814")).toBe("3209078814");
    expect(normalizarTelefonoPegado("320-907-8814")).toBe("3209078814");
  });
});

describe("texto", () => {
  it("correo", () => {
    expect(esCorreo("laura@correo.com")).toBe(true);
    expect(esCorreo("laura@correo")).toBe(false);
    expect(esCorreo("  laura@correo.com  ")).toBe(true);
  });

  it("filtros al teclear", () => {
    expect(soloDigitos("1.045.678")).toBe("1045678");
    expect(sinDigitos("Laura 2 Gutiérrez")).toBe("Laura  Gutiérrez");
  });

  it("buscar sin tildes: «Gutierrez» encuentra a «Gutiérrez»", () => {
    expect(normalizar("Gutiérrez")).toBe(normalizar("gutierrez"));
  });

  it("nombres repetidos: misma clave sin tildes, mayúsculas ni espacios de más", () => {
    expect(claveNombre("  laura   gutierrez ")).toBe(claveNombre("Laura Gutiérrez"));
  });
});
