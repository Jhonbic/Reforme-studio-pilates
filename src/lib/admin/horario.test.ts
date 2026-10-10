import { describe, expect, it } from "vitest";
import {
  cadaSemana,
  diaSemana,
  diasEntre,
  finDe,
  lunesDe,
  seSolapan,
  sumarDias,
} from "./horario";

describe("horas y solapes", () => {
  it("la hora de fin se calcula", () => {
    expect(finDe("07:00", 50)).toBe("07:50");
    expect(finDe("18:30", 55)).toBe("19:25");
  });

  it("encadenar dos clases NO es solaparse (comparación estricta)", () => {
    // 07:00–07:50 y 07:50–08:40: con `<=` nadie podría encadenar clases.
    expect(seSolapan("07:00", 50, "07:50", 50)).toBe(false);
    expect(seSolapan("07:50", 50, "07:00", 50)).toBe(false);
  });

  it("detecta solapes parciales y contenidos", () => {
    expect(seSolapan("07:00", 50, "07:30", 30)).toBe(true);
    expect(seSolapan("07:00", 120, "07:30", 10)).toBe(true);
    expect(seSolapan("18:00", 50, "18:00", 55)).toBe(true);
  });
});

describe("fechas en UTC (sin corrimientos por zona horaria)", () => {
  it("suma días cruzando mes y año", () => {
    expect(sumarDias("2026-01-31", 1)).toBe("2026-02-01");
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(sumarDias("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("días entre fechas, con signo", () => {
    expect(diasEntre("2026-09-01", "2026-10-01")).toBe(30);
    expect(diasEntre("2026-10-01", "2026-09-01")).toBe(-30);
  });

  it("la semana empieza en LUNES (getUTCDay da domingo = 0)", () => {
    expect(diaSemana("2026-10-05")).toBe(0); // lunes
    expect(diaSemana("2026-10-11")).toBe(6); // domingo
    expect(lunesDe("2026-10-11")).toBe("2026-10-05");
    expect(lunesDe("2026-10-05")).toBe("2026-10-05");
  });
});

describe("clases que se repiten", () => {
  it("dice el día en plural, también sábado y domingo", () => {
    // 2026-10-12 es lunes; el 17, sábado; el 18, domingo.
    expect(cadaSemana("2026-10-12")).toBe("todos los lunes");
    expect(cadaSemana("2026-10-14")).toBe("todos los miércoles");
    expect(cadaSemana("2026-10-17")).toBe("todos los sábados");
    expect(cadaSemana("2026-10-18")).toBe("todos los domingos");
  });
});
