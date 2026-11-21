import { describe, expect, it } from "vitest";
import {
  agruparPorDia,
  contarPorTipo,
  cuandoPaso,
  diaDelAviso,
  esNuevo,
  filtrarAvisos,
  quienLoHizo,
  type AvisoReserva,
} from "./actividad";

function aviso(parcial: Partial<AvisoReserva>): AvisoReserva {
  return {
    id: "a",
    creadoEn: "2026-11-21T15:00:00Z",
    tipo: "Reservó",
    origen: "Cliente",
    hechoPor: "Laura",
    clienteId: "c",
    cliente: "Laura",
    clase: { fecha: "2026-11-27", hora: "07:00", tipo: "Reformer" },
    anterior: null,
    detalle: null,
    mio: false,
    ...parcial,
  };
}

describe("actividad de reservas", () => {
  it("el día es el de Colombia: a las 20:00 de Bogotá en UTC ya es mañana", () => {
    // 01:00 UTC del 22 = 20:00 del 21 en Bogotá.
    expect(diaDelAviso("2026-11-22T01:00:00Z")).toBe("2026-11-21");
  });

  it("agrupa por día de Colombia, conservando el orden", () => {
    const grupos = agruparPorDia(
      [
        aviso({ id: "1", creadoEn: "2026-11-22T01:00:00Z" }), // 21 nov, 20:00
        aviso({ id: "2", creadoEn: "2026-11-21T13:00:00Z" }), // 21 nov, 08:00
        aviso({ id: "3", creadoEn: "2026-11-20T13:00:00Z" }),
      ],
      "2026-11-21",
    );
    expect(grupos.map((g) => [g.titulo, g.avisos.map((a) => a.id)])).toEqual([
      ["Hoy", ["1", "2"]],
      ["Ayer", ["3"]],
    ]);
  });

  it("cuánto hace: minutos, horas y luego la hora del día", () => {
    const ahora = "2026-11-21T15:00:00Z";
    expect(cuandoPaso("2026-11-21T14:59:40Z", ahora)).toBe("Ahora");
    expect(cuandoPaso("2026-11-21T14:55:00Z", ahora)).toBe("Hace 5 min");
    expect(cuandoPaso("2026-11-21T12:00:00Z", ahora)).toBe("Hace 3 h");
    // 08:00 UTC = 03:00 en Bogotá.
    expect(cuandoPaso("2026-11-21T08:00:00Z", ahora)).toBe("03:00");
  });

  it("lo que hizo uno mismo nunca es «nuevo»", () => {
    const visto = "2026-11-21T14:00:00Z";
    expect(esNuevo(aviso({}), visto)).toBe(true);
    expect(esNuevo(aviso({ mio: true, origen: "Equipo" }), visto)).toBe(false);
    expect(esNuevo(aviso({ creadoEn: "2026-11-21T13:00:00Z" }), visto)).toBe(false);
  });

  it("los recuentos por tipo cuentan lo que deja el filtro de quién", () => {
    const avisos = [
      aviso({ tipo: "Reservó", origen: "Cliente" }),
      aviso({ tipo: "Canceló", origen: "Cliente" }),
      aviso({ tipo: "Canceló", origen: "Equipo" }),
      aviso({ tipo: "Reservó", origen: "Lista de espera" }),
    ];
    const delCliente = filtrarAvisos(avisos, "Todos", "Cliente");
    expect(contarPorTipo(delCliente)).toEqual({ Todos: 2, Reservó: 1, Canceló: 1, Cambió: 0 });
    expect(filtrarAvisos(avisos, "Canceló", "Todos")).toHaveLength(2);
  });

  it("dice quién lo hizo, y una baja no parece una cancelación del cliente", () => {
    expect(quienLoHizo(aviso({ origen: "Cliente" }))).toBe("Desde su cuenta");
    expect(quienLoHizo(aviso({ origen: "Equipo", hechoPor: "Ana" }))).toBe("Desde el panel · Ana");
    expect(quienLoHizo(aviso({ origen: "Lista de espera", hechoPor: null }))).toBe(
      "Entró sola desde la lista de espera",
    );
    expect(
      quienLoHizo(aviso({ tipo: "Canceló", origen: "Equipo", hechoPor: "Ana", detalle: "Dada de baja" })),
    ).toBe("Al darla de baja · Ana");
  });
});
