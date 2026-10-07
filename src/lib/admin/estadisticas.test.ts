import { describe, expect, it } from "vitest";
import {
  activosHoy,
  dormidos,
  mapaHorarios,
  movimientoPorMes,
  perfilEdades,
  permanencia,
  porPlan,
  tramosPorCliente,
  usoPorPlan,
  type DatosEstadisticas,
} from "./estadisticas";
import type { ClaseEnAgenda } from "./types";

const hoy = "2026-10-15";

const m = (clienteId: string, inicio: string, vencimiento: string, planId = "mensual") => ({
  clienteId,
  planId,
  inicio,
  vencimiento,
});

function datos(parcial: Partial<DatosEstadisticas> = {}): DatosEstadisticas {
  return {
    clientes: [],
    membresias: [],
    pagos: [],
    planes: [
      { id: "mensual", nombre: "Mensual", clasesIncluidas: 12, vigenciaDias: 30 },
      { id: "libre", nombre: "Libre", clasesIncluidas: null, vigenciaDias: 30 },
    ],
    ...parcial,
  };
}

describe("tramos", () => {
  it("renovar hasta 30 días tarde NO es irse: es el mismo tramo", () => {
    const t = tramosPorCliente([m("a", "2026-01-01", "2026-01-31"), m("a", "2026-02-20", "2026-03-21")]);
    expect(t.get("a")).toEqual([{ ini: "2026-01-01", fin: "2026-03-22" }]);
  });

  it("volver después del margen abre un tramo nuevo (un regreso)", () => {
    const t = tramosPorCliente([m("a", "2026-01-01", "2026-01-31"), m("a", "2026-04-01", "2026-04-30")]);
    expect(t.get("a")).toHaveLength(2);
  });
});

describe("altas y bajas por mes", () => {
  it("cuenta alta, regreso y baja en el mes que toca", () => {
    const t = tramosPorCliente([
      m("a", "2026-05-01", "2026-05-31"), // se va el 1 jun
      m("a", "2026-08-10", "2026-09-08"), // vuelve en agosto; vence hace >30 días
      m("b", "2026-08-03", "2026-12-31"),
    ]);
    const s = movimientoPorMes(t, hoy);
    const de = (mes: string) => s.find((x) => x.mes === mes)!;
    expect(s[0].mes).toBe("2026-05"); // arranca en la primera membresía, no antes
    expect(de("2026-05").altas).toBe(1);
    expect(de("2026-06").bajas).toBe(1);
    expect(de("2026-08")).toMatchObject({ altas: 1, regresos: 1 });
    expect(de("2026-09").bajas).toBe(1);
  });

  it("el último vencimiento de hace menos de 30 días queda «por confirmar», no es baja", () => {
    const s = movimientoPorMes(tramosPorCliente([m("a", "2026-09-01", "2026-09-30")]), hoy);
    expect(s.find((x) => x.mes === "2026-10")).toMatchObject({ bajas: 0, porConfirmar: 1 });
  });

  it("sin membresías no hay serie", () => {
    expect(movimientoPorMes(new Map(), hoy)).toEqual([]);
  });
});

describe("permanencia y planes", () => {
  it("mediana de meses y valor promedio por cliente", () => {
    const t = tramosPorCliente([m("a", "2026-07-17", "2026-10-14"), m("b", "2026-09-15", "2026-10-14")]);
    const p = permanencia(t, [
      { clienteId: "a", importe: 300_000 },
      { clienteId: "b", importe: 100_000 },
    ], hoy);
    expect(p.mesesMediana).toBe(2); // 3 meses y 1 mes → mediana 2
    expect(p.valorPromedio).toBe(200_000);
  });

  it("renovación por plan: solo vencimientos con el margen ya cumplido", () => {
    const filas = porPlan(
      datos({
        membresias: [
          m("a", "2026-07-01", "2026-07-31"),
          m("a", "2026-08-01", "2026-08-31"), // renovó: a renueva la de julio
          m("b", "2026-07-01", "2026-07-31"), // no renovó
          m("c", "2026-09-20", "2026-10-10"), // venció hace 5 días: aún no cuenta
        ],
      }),
      hoy,
    );
    expect(filas[0]).toMatchObject({ plan: "Mensual", vendidos: 4, vencieron: 3, renovaron: 1 });
  });

  it("edad de los activos por rangos, con «Sin dato» solo si hay", () => {
    const d = datos({
      clientes: [
        { id: "a", nombre: "A", nacimiento: "1996-10-15" }, // 30
        { id: "b", nombre: "B", nacimiento: null },
        { id: "inactivo", nombre: "I", nacimiento: "2000-01-01" },
      ],
      membresias: [m("a", "2026-10-01", "2026-10-31"), m("b", "2026-10-01", "2026-10-31")],
    });
    const p = perfilEdades(d, activosHoy(d.membresias, hoy), hoy);
    expect(p.total).toBe(2);
    expect(p.edades.find((e) => e.etiqueta === "25–34")?.n).toBe(1);
    expect(p.edades.at(-1)).toEqual({ etiqueta: "Sin dato", n: 1 });
  });
});

describe("clases", () => {
  const clase = (p: Partial<ClaseEnAgenda>): ClaseEnAgenda => ({
    id: "c",
    tipo: "Reformer",
    fecha: "2026-10-12",
    horaInicio: "07:00",
    horaFin: "07:50",
    duracionMin: 50,
    instructoraId: "i",
    instructora: "Daniela",
    cupos: 8,
    reservas: 4,
    libres: 4,
    cancelada: false,
    estado: "Finalizada",
    reservados: [],
    ...p,
  });

  it("el mapa de horarios promedia la ocupación de cada franja día × hora", () => {
    const mapa = mapaHorarios(
      [
        clase({ id: "1", fecha: "2026-10-12", reservas: 8 }), // lunes 07:00
        clase({ id: "2", fecha: "2026-10-05", reservas: 4 }), // lunes 07:00
        clase({ id: "3", fecha: "2026-10-12", cancelada: true }), // no cuenta
        clase({ id: "4", fecha: "2026-10-16" }), // futura: no cuenta
      ],
      hoy,
    );
    expect(mapa.dias.map((d) => d.nombre)).toEqual(["Lun"]);
    expect(mapa.celdas["0|07:00"]).toMatchObject({ clases: 2, ocupacion: 75 });
  });

  it("dormido = activo sin reservas en ±14 días; quien reservó para la semana que viene no lo es", () => {
    const r = (clienteId: string) => ({ id: clienteId, clienteId, nombre: clienteId });
    const lista = dormidos(
      [
        clase({ fecha: "2026-09-10", reservados: [r("a")] }),
        clase({ id: "2", fecha: "2026-10-20", estado: "Programada", reservados: [r("b")] }),
      ],
      new Set(["a", "b", "c"]),
      hoy,
    );
    expect(lista).toEqual([
      { clienteId: "c", ultima: null },
      { clienteId: "a", ultima: "2026-09-10" },
    ]);
  });

  it("uso del plan: reservas por semana frente a lo que incluye", () => {
    const r = { id: "r", clienteId: "a", nombre: "A" };
    const filas = usoPorPlan(
      datos({ membresias: [m("a", "2026-10-01", "2026-10-31")] }),
      [1, 2, 3, 4, 5, 6, 7, 8].map((i) => clase({ id: String(i), fecha: "2026-10-0" + ((i % 9) || 1), reservados: [r] })),
      hoy,
    );
    expect(filas[0]).toMatchObject({ plan: "Mensual", clientes: 1, porSemana: 2, incluyePorSemana: 2.8 });
  });
});
