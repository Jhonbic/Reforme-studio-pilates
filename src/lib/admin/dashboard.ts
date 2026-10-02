import { calcularVariacion, moneda, numero } from "./format";
import { sumarDias } from "./horario";
import {
  MESES_LARGOS,
  enPeriodo,
  esteMes,
  etiquetaPeriodo,
  periodoAnterior,
  type Periodo,
} from "./periodo";
import type {
  CategoriaGasto,
  EstadoMembresia,
  GastoCategoria,
  Indicador,
  MesFinanciero,
  MetodoPago,
  MovimientoClientes,
  Presupuesto,
  RepartoMetodoPago,
  RepartoPlan,
} from "./types";

/**
 * El Dashboard calculado a partir de las filas de la base.
 *
 * Funciones PURAS: reciben filas y `hoy`, devuelven cifras. No saben nada de
 * Supabase (eso es `getDatosDashboard()` en `queries.ts`), así que se pueden
 * probar con datos a mano y comparar contra un cálculo SQL independiente.
 */

export type DatosDashboard = {
  pagos: { fecha: string; importe: number; metodo: MetodoPago; plan: string | null }[];
  gastos: { fecha: string; importe: number; categoria: CategoriaGasto }[];
  presupuestos: Presupuesto[];
  /** Filas de `clientes_vigentes`: el estado y la última membresía de cada cliente. */
  vigentes: {
    plan: string | null;
    estado: EstadoMembresia | null;
    vencimiento: string | null;
    importeRenovacion: number;
  }[];
  /** `clientes.alta` de cada cliente. */
  altas: string[];
  membresias: { clienteId: string; inicio: string; vencimiento: string }[];
};

/** Horizonte de «por vencer» de la cifra de cabecera: una semana, el plazo en
 *  el que todavía da tiempo a llamar antes de que se caiga la membresía. */
export const DIAS_POR_VENCER = 7;

/** Ventana de los repartos (planes, métodos) y de la tasa de renovación. */
const VENTANA = 30;

const MESES_CORTOS = MESES_LARGOS.map((m) => m[0].toUpperCase() + m.slice(1, 3));

const suma = <T>(filas: T[], valor: (f: T) => number) =>
  filas.reduce((t, f) => t + valor(f), 0);

/** Variación solo con una base positiva: con una utilidad anterior negativa,
 *  el porcentaje sale con el signo al revés y dice lo contrario de lo que pasó. */
const variacionSegura = (actual: number, anterior: number) =>
  anterior > 0 ? calcularVariacion(actual, anterior) : null;

/** Clientes con una membresía que cubre ese día. Es la definición de «activo». */
function vigentesEl(dia: string, membresias: DatosDashboard["membresias"]): number {
  const ids = new Set<string>();
  for (const m of membresias) {
    if (m.inicio <= dia && dia <= m.vencimiento) ids.add(m.clienteId);
  }
  return ids.size;
}

function ultimos(dias: number, hoy: string): Periodo {
  return { desde: sumarDias(hoy, -(dias - 1)), hasta: hoy };
}

/**
 * Las cuatro cifras de cabecera. La primera es la de la tarjeta principal.
 *
 * ⚠️ Mes en curso frente al MISMO TRAMO del mes anterior, igual que Finanzas
 * (`periodoAnterior`): el día 1 no se compara con el mes entero.
 *
 * ⚠️ **«Clientes activos» = membresía vigente.** Antes la cifra contaba
 * «Activa + Por vencer» y el texto de debajo hablaba de inactivos que no
 * estaban dentro. Ahora los inactivos SÍ cuentan (tienen el plan pagado) y el
 * detalle dice cuántos de ellos llevan 30 días sin venir. Así se puede
 * comparar con hace un mes, porque «vigente» se sabe para cualquier fecha y
 * la inactividad no.
 */
export function indicadores(d: DatosDashboard, hoy: string): Indicador[] {
  const mes = esteMes(hoy);
  const previo = periodoAnterior(mes);
  const ingresos = suma(d.pagos.filter((p) => enPeriodo(p.fecha, mes)), (p) => p.importe);
  const ingresosPrevios = suma(d.pagos.filter((p) => enPeriodo(p.fecha, previo)), (p) => p.importe);
  const gastos = suma(d.gastos.filter((g) => enPeriodo(g.fecha, mes)), (g) => g.importe);
  const gastosPrevios = suma(d.gastos.filter((g) => enPeriodo(g.fecha, previo)), (g) => g.importe);

  const activos = vigentesEl(hoy, d.membresias);
  const activosAntes = vigentesEl(sumarDias(hoy, -30), d.membresias);
  const sinVenir = d.vigentes.filter((v) => v.estado === "Inactiva").length;

  const limite = sumarDias(hoy, DIAS_POR_VENCER);
  const porVencer = d.vigentes.filter(
    (v) => v.vencimiento !== null && v.vencimiento >= hoy && v.vencimiento <= limite,
  );

  const etiqueta = etiquetaPeriodo(mes, hoy);
  const etiquetaPrevia = etiquetaPeriodo(previo, hoy);

  return [
    {
      // "por mes" y no "del mes": la tarjeta enseña también la serie. A qué
      // mes se refiere el número grande lo dice `detalle`.
      etiqueta: "Ingresos por mes",
      valor: ingresos,
      formato: "moneda",
      variacion: variacionSegura(ingresos, ingresosPrevios),
      subirEsBueno: true,
      detalle: `${etiqueta} · frente a ${etiquetaPrevia}`,
    },
    {
      etiqueta: "Utilidad del mes",
      valor: ingresos - gastos,
      formato: "moneda",
      variacion: variacionSegura(ingresos - gastos, ingresosPrevios - gastosPrevios),
      subirEsBueno: true,
      detalle: "Ingresos menos gastos",
    },
    {
      etiqueta: "Clientes activos",
      valor: activos,
      formato: "numero",
      variacion: calcularVariacion(activos, activosAntes),
      subirEsBueno: true,
      detalle:
        sinVenir === 0
          ? "con membresía vigente"
          : `${numero(sinVenir)} sin venir hace 30 días`,
    },
    {
      // OJO: no es la cartera vencida (dinero que ya se debe), sino la que
      // está A PUNTO de vencer: lo que hay que renovar esta semana.
      etiqueta: "Cartera por vencer",
      valor: suma(porVencer, (v) => v.importeRenovacion),
      formato: "moneda",
      variacion: null,
      // Que suba significa más plata pendiente de renovar: no es buena noticia.
      subirEsBueno: false,
      detalle: `${numero(porVencer.length)} ${porVencer.length === 1 ? "cliente vence" : "clientes vencen"} en ${DIAS_POR_VENCER} días`,
    },
  ];
}

/**
 * Los últimos doce meses, el en curso incluido, con ingresos y gastos.
 *
 * ⚠️ **Salen los doce aunque alguno esté a cero.** Un mes sin datos es
 * información («no se cobró nada»), y quitarlo haría que la gráfica uniera dos
 * meses no consecutivos como si fueran seguidos.
 */
export function serieMensual(d: DatosDashboard, hoy: string): MesFinanciero[] {
  let anio = Number(hoy.slice(0, 4));
  let mes = Number(hoy.slice(5, 7)) - 1;
  const serie: MesFinanciero[] = [];
  for (let i = 0; i < 12; i++) {
    const clave = `${anio}-${String(mes + 1).padStart(2, "0")}`;
    serie.unshift({
      mes: MESES_CORTOS[mes],
      anio,
      ingresos: suma(d.pagos.filter((p) => p.fecha.startsWith(clave)), (p) => p.importe),
      gastos: suma(d.gastos.filter((g) => g.fecha.startsWith(clave)), (g) => g.importe),
    });
    [anio, mes] = mes === 0 ? [anio - 1, 11] : [anio, mes - 1];
  }
  return serie;
}

/**
 * Cobrado por plan en los últimos 30 días, con los clientes de cada plan.
 *
 * Ventana móvil y no «este mes», igual que la tarjeta de Planes: el día 1 el
 * donut estaría vacío. Máximo 4 porciones —es el límite de la paleta de
 * gráficos—: a partir de la quinta se agrupan en «Otros».
 */
export function repartoPlanes(d: DatosDashboard, hoy: string): RepartoPlan[] {
  // Clientes por plan con la misma regla que la pantalla de Planes: los que
  // lo tienen sin vencer.
  const clientesPorPlan = new Map<string, number>();
  for (const c of d.vigentes) {
    if (!c.plan || c.estado === "Vencida") continue;
    clientesPorPlan.set(c.plan, (clientesPorPlan.get(c.plan) ?? 0) + 1);
  }

  const v = ultimos(VENTANA, hoy);
  const porPlan = new Map<string, number>();
  for (const p of d.pagos) {
    if (!enPeriodo(p.fecha, v)) continue;
    const plan = p.plan ?? "Sin plan";
    porPlan.set(plan, (porPlan.get(plan) ?? 0) + p.importe);
  }
  const filas = [...porPlan]
    .map(([plan, importe]) => ({ plan, importe, clientes: clientesPorPlan.get(plan) ?? 0 }))
    .sort((a, b) => b.importe - a.importe);

  if (filas.length <= 4) return filas;
  const resto = filas.slice(3);
  return [
    ...filas.slice(0, 3),
    { plan: "Otros", importe: suma(resto, (f) => f.importe), clientes: suma(resto, (f) => f.clientes) },
  ];
}

/** Cobrado por método en los últimos 30 días. Salen los cuatro aunque alguno
 *  esté a cero: «nadie paga con tarjeta» también es una respuesta. */
export function repartoMetodos(d: DatosDashboard, hoy: string): RepartoMetodoPago[] {
  const v = ultimos(VENTANA, hoy);
  const metodos: MetodoPago[] = ["Nequi", "Transferencia", "Efectivo", "Tarjeta"];
  return metodos
    .map((metodo) => ({
      metodo,
      importe: suma(
        d.pagos.filter((p) => p.metodo === metodo && enPeriodo(p.fecha, v)),
        (p) => p.importe,
      ),
    }))
    .sort((a, b) => b.importe - a.importe);
}

/**
 * Altas y bajas de los últimos 6 meses.
 *
 * - **Alta**: la fecha de alta del cliente cae en ese mes.
 * - **Baja**: la ÚLTIMA membresía de un cliente venció ese mes y ya pasó. Si
 *   renovó, su última membresía es otra y no cuenta como baja: renovar a
 *   tiempo no es irse.
 */
export function altasYBajas(d: DatosDashboard, hoy: string): MovimientoClientes[] {
  const ultima = new Map<string, string>();
  for (const m of d.membresias) {
    const v = ultima.get(m.clienteId);
    if (!v || m.vencimiento > v) ultima.set(m.clienteId, m.vencimiento);
  }
  const bajas = [...ultima.values()].filter((v) => v < hoy);

  let anio = Number(hoy.slice(0, 4));
  let mes = Number(hoy.slice(5, 7)) - 1;
  const serie: MovimientoClientes[] = [];
  for (let i = 0; i < 6; i++) {
    const clave = `${anio}-${String(mes + 1).padStart(2, "0")}`;
    serie.unshift({
      mes: MESES_CORTOS[mes],
      altas: d.altas.filter((a) => a.startsWith(clave)).length,
      bajas: bajas.filter((b) => b.startsWith(clave)).length,
    });
    [anio, mes] = mes === 0 ? [anio - 1, 11] : [anio, mes - 1];
  }
  return serie;
}

/**
 * De las membresías que vencieron en una ventana, qué parte se renovó: el
 * mismo cliente tiene otra membresía que empieza después.
 *
 * `null` si en la ventana no venció ninguna: sin vencimientos la pregunta no
 * aplica, y eso no es «0 %» (que sería «nadie renovó»).
 */
function tasaEn(v: Periodo, membresias: DatosDashboard["membresias"]): number | null {
  const vencidas = membresias.filter((m) => enPeriodo(m.vencimiento, v));
  if (vencidas.length === 0) return null;
  const renovadas = vencidas.filter((m) =>
    membresias.some((o) => o.clienteId === m.clienteId && o.inicio > m.inicio),
  );
  return (renovadas.length / vencidas.length) * 100;
}

/** Tasa de renovación de los últimos 30 días (sin hoy: lo que vence hoy aún
 *  puede renovarse), frente a los 30 anteriores. La variación va en PUNTOS. */
export function tasaRenovacion(d: DatosDashboard, hoy: string) {
  const ayer = sumarDias(hoy, -1);
  const v = ultimos(VENTANA, ayer);
  const previa = ultimos(VENTANA, sumarDias(v.desde, -1));
  const valor = tasaEn(v, d.membresias);
  const anterior = tasaEn(previa, d.membresias);
  return {
    valor,
    variacion: valor !== null && anterior !== null ? valor - anterior : null,
  };
}

/** Gastos del mes en curso por categoría, con su presupuesto. */
export function gastosDelMes(d: DatosDashboard, hoy: string): GastoCategoria[] {
  const mes = esteMes(hoy);
  const gastado = new Map<CategoriaGasto, number>();
  for (const g of d.gastos) {
    if (enPeriodo(g.fecha, mes)) gastado.set(g.categoria, (gastado.get(g.categoria) ?? 0) + g.importe);
  }
  const previsto = new Map<CategoriaGasto, number>();
  for (const p of d.presupuestos) {
    if (p.mes === mes.desde) previsto.set(p.categoria, p.importe);
  }
  return [...new Set([...gastado.keys(), ...previsto.keys()])]
    .map((categoria) => ({
      categoria,
      importe: gastado.get(categoria) ?? 0,
      presupuesto: previsto.get(categoria) ?? 0,
    }))
    .sort((a, b) => b.importe - a.importe);
}

/** El primer aviso de la campana: lo mismo que «Cartera por vencer». */
export function avisoPorVencer(d: Pick<DatosDashboard, "vigentes">, hoy: string) {
  const limite = sumarDias(hoy, DIAS_POR_VENCER);
  const porVencer = d.vigentes.filter(
    (v) => v.vencimiento !== null && v.vencimiento >= hoy && v.vencimiento <= limite,
  );
  return {
    cuantos: porVencer.length,
    importe: moneda(suma(porVencer, (v) => v.importeRenovacion)),
  };
}
