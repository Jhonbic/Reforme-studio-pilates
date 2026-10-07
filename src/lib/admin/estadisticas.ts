import { diaSemana, diasEntre, DIAS_CORTOS, sumarDias } from "./horario";
import { MESES_LARGOS } from "./periodo";
import type { ClaseEnAgenda } from "./types";
import { edad } from "../validacion";

/**
 * Estadísticas del negocio (`/admin/estadisticas`, solo Administración).
 *
 * Copia de la pantalla de Estadísticas de `admingymdemo` (decisión del
 * usuario, oct 2026): altas y bajas por mes, permanencia y planes, y quiénes
 * son. Más un bloque propio de un estudio de pilates: las clases.
 *
 * ⚠️ **Aquí no se deduce nada de los pagos, a diferencia de la demo.** La demo
 * no guarda el historial de membresías y reconstruye cada cliente desde sus
 * pagos; Reforme sí lo guarda (tabla `membresias`, con inicio y vencimiento),
 * así que los tramos salen exactos.
 *
 * No repite Finanzas: aquí se habla de clientes (cuántos entran, cuántos se
 * quedan y cuánto tiempo), no de la plata de un periodo.
 *
 * Funciones PURAS: reciben filas y `hoy`, devuelven cifras.
 */

export type DatosEstadisticas = {
  clientes: { id: string; nombre: string; nacimiento: string | null }[];
  membresias: { clienteId: string; planId: string; inicio: string; vencimiento: string }[];
  pagos: { clienteId: string; importe: number }[];
  planes: { id: string; nombre: string; clasesIncluidas: number | null; vigenciaDias: number }[];
};

/**
 * Quien renueva hasta 30 días después de vencer cuenta como que nunca se fue
 * («renovó tarde»); más allá, se fue y si vuelve es un regreso. Es el mismo
 * margen que «Recuperables» del dashboard.
 */
export const MARGEN = 30;
/** La serie de altas y bajas trae siempre los últimos 24 meses (el periodo
 *  más largo del selector) y la pantalla recorta 3 / 6 / 12. */
export const MESES_SERIE = 24;

export const RANGOS_EDAD: [string, number, number][] = [
  ["Menos de 18", 0, 17],
  ["18–24", 18, 24],
  ["25–34", 25, 34],
  ["35–44", 35, 44],
  ["45–54", 45, 54],
  ["55 o más", 55, 200],
];

const MESES_CORTOS = MESES_LARGOS.map((m) => m[0].toUpperCase() + m.slice(1, 3));

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : null);
const primeroDeMes = (iso: string) => `${iso.slice(0, 7)}-01`;
const mesSiguiente = (mes: string) => primeroDeMes(sumarDias(mes, 32));
const finDeMes = (mes: string) => sumarDias(mesSiguiente(mes), -1);

/** «Oct 2026» a partir de «2026-10». */
export function etiquetaMes(mes: string): string {
  return `${MESES_CORTOS[Number(mes.slice(5, 7)) - 1]} ${mes.slice(0, 4)}`;
}

/** Un periodo seguido de membresía: `fin` es EXCLUSIVO (el día después del
 *  último día pagado), para que «activo el día d» sea `ini <= d < fin`. */
export type Tramo = { ini: string; fin: string };

/**
 * Los tramos de cada cliente: sus membresías en orden, fundiendo las que se
 * pisan o empiezan antes de que pase el margen desde que venció la anterior.
 */
export function tramosPorCliente(membresias: DatosEstadisticas["membresias"]): Map<string, Tramo[]> {
  const porCliente = new Map<string, { ini: string; fin: string }[]>();
  for (const m of membresias) {
    const lista = porCliente.get(m.clienteId) ?? [];
    lista.push({ ini: m.inicio, fin: sumarDias(m.vencimiento, 1) });
    porCliente.set(m.clienteId, lista);
  }
  const tramos = new Map<string, Tramo[]>();
  for (const [id, lista] of porCliente) {
    lista.sort((a, b) => a.ini.localeCompare(b.ini));
    const propios: Tramo[] = [];
    let actual: Tramo | null = null;
    for (const m of lista) {
      if (actual && m.ini <= sumarDias(actual.fin, MARGEN)) {
        if (m.fin > actual.fin) actual.fin = m.fin;
      } else {
        if (actual) propios.push(actual);
        actual = { ...m };
      }
    }
    if (actual) propios.push(actual);
    tramos.set(id, propios);
  }
  return tramos;
}

const cubre = (tramos: Tramo[], dia: string) => tramos.some((t) => t.ini <= dia && dia < t.fin);

export type MesMovimiento = {
  /** «2026-10». */
  mes: string;
  altas: number;
  regresos: number;
  bajas: number;
  /** Vencieron hace menos de 30 días: aún pueden renovar. No se dibujan. */
  porConfirmar: number;
  activosInicio: number;
  /** Bajas del mes ÷ activos al empezar el mes. */
  bajasPct: number | null;
};

/**
 * Altas, regresos y bajas de los últimos 24 meses. La serie arranca en el mes
 * de la primera membresía y no antes: dibujar en cero los meses previos a que
 * el sistema existiera mostraría un crecimiento que nunca ocurrió.
 *
 * - **Alta** = empieza el primer tramo de un cliente; **regreso** = empieza uno
 *   posterior.
 * - **Baja** = termina un tramo, contada en el mes en que venció. El último
 *   tramo de un cliente es baja solo cuando ya pasó el margen; antes va como
 *   «por confirmar», porque todavía puede renovar.
 */
export function movimientoPorMes(tramos: Map<string, Tramo[]>, hoy: string): MesMovimiento[] {
  const inicios = [...tramos.values()].map((l) => l[0].ini);
  if (inicios.length === 0) return [];
  const primero = primeroDeMes(inicios.reduce((a, b) => (a < b ? a : b)));
  let pedido = primeroDeMes(hoy);
  for (let i = 0; i < MESES_SERIE - 1; i++) pedido = primeroDeMes(sumarDias(pedido, -1));
  const desde = pedido > primero ? pedido : primero;

  const serie: MesMovimiento[] = [];
  for (let mes = desde; mes <= hoy; mes = mesSiguiente(mes)) {
    const fin = finDeMes(mes);
    let altas = 0;
    let regresos = 0;
    let bajas = 0;
    let porConfirmar = 0;
    let activosInicio = 0;
    for (const lista of tramos.values()) {
      if (cubre(lista, mes)) activosInicio++;
      lista.forEach((t, i) => {
        if (t.ini >= mes && t.ini <= fin) {
          if (i === 0) altas++;
          else regresos++;
        }
        // El día que «se va» es el último día pagado + 1 (`fin`).
        if (t.fin < mes || t.fin > fin || t.fin > hoy) return;
        if (i < lista.length - 1 || diasEntre(t.fin, hoy) > MARGEN) bajas++;
        else porConfirmar++;
      });
    }
    serie.push({
      mes: mes.slice(0, 7),
      altas,
      regresos,
      bajas,
      porConfirmar,
      activosInicio,
      bajasPct: pct(bajas, activosInicio),
    });
  }
  return serie;
}

/** Cuánto se queda un cliente (mediana, en meses) y cuánto deja de media, hasta hoy. */
export function permanencia(
  tramos: Map<string, Tramo[]>,
  pagos: DatosEstadisticas["pagos"],
  hoy: string,
) {
  const meses: number[] = [];
  for (const lista of tramos.values()) {
    const dias = lista.reduce((s, t) => s + Math.max(0, diasEntre(t.ini, t.fin < hoy ? t.fin : hoy)), 0);
    if (dias > 0) meses.push(dias / 30);
  }
  meses.sort((a, b) => a - b);
  const mitad = Math.floor(meses.length / 2);
  const mediana = !meses.length
    ? null
    : meses.length % 2
      ? meses[mitad]
      : (meses[mitad - 1] + meses[mitad]) / 2;

  const pagado = new Map<string, number>();
  for (const p of pagos) pagado.set(p.clienteId, (pagado.get(p.clienteId) ?? 0) + p.importe);
  const total = [...pagado.values()].reduce((s, v) => s + v, 0);
  return {
    clientes: meses.length,
    mesesMediana: mediana === null ? null : Math.round(mediana * 10) / 10,
    valorPromedio: pagado.size ? Math.round(total / pagado.size) : null,
  };
}

export type FilaPlan = {
  plan: string;
  vendidos: number;
  activosHoy: number;
  vencieron: number;
  renovaron: number;
  renovacion: number | null;
};

/**
 * Por plan: cuántas veces se vendió (cada membresía es una venta), cuántos
 * clientes lo tienen hoy y qué parte renovó.
 *
 * Renovación: membresías de ese plan que vencieron en los últimos 12 meses
 * **con el margen ya cumplido** (las de los últimos 30 días todavía pueden
 * renovar, y contarlas como «no renovó» sesgaría para abajo). Cuenta como
 * renovada si el cliente tiene otra membresía, de cualquier plan, que empieza
 * antes de que pase el margen.
 */
export function porPlan(d: DatosEstadisticas, hoy: string): FilaPlan[] {
  const nombre = new Map(d.planes.map((p) => [p.id, p.nombre]));
  const filas = new Map<string, FilaPlan>();
  const fila = (planId: string) => {
    let f = filas.get(planId);
    if (!f) {
      f = {
        plan: nombre.get(planId) ?? "Plan eliminado",
        vendidos: 0,
        activosHoy: 0,
        vencieron: 0,
        renovaron: 0,
        renovacion: null,
      };
      filas.set(planId, f);
    }
    return f;
  };

  const porCliente = new Map<string, DatosEstadisticas["membresias"]>();
  for (const m of d.membresias) {
    const lista = porCliente.get(m.clienteId) ?? [];
    lista.push(m);
    porCliente.set(m.clienteId, lista);
  }

  const desde = sumarDias(hoy, -365);
  const hasta = sumarDias(hoy, -MARGEN);
  for (const lista of porCliente.values()) {
    lista.sort((a, b) => a.inicio.localeCompare(b.inicio));
    // Activo hoy con el plan de la membresía que cubre hoy.
    const deHoy = lista.filter((m) => m.inicio <= hoy && hoy <= m.vencimiento).at(-1);
    if (deHoy) fila(deHoy.planId).activosHoy++;
    for (const m of lista) {
      const f = fila(m.planId);
      f.vendidos++;
      if (m.vencimiento < desde || m.vencimiento > hasta) continue;
      f.vencieron++;
      const limite = sumarDias(m.vencimiento, MARGEN + 1);
      if (lista.some((o) => o.inicio > m.inicio && o.inicio <= limite)) f.renovaron++;
    }
  }
  return [...filas.values()]
    .map((f) => ({ ...f, renovacion: pct(f.renovaron, f.vencieron) }))
    .sort((a, b) => b.vendidos - a.vendidos || b.activosHoy - a.activosHoy);
}

/** Ids de los clientes con una membresía que cubre hoy. */
export function activosHoy(membresias: DatosEstadisticas["membresias"], hoy: string): Set<string> {
  return new Set(membresias.filter((m) => m.inicio <= hoy && hoy <= m.vencimiento).map((m) => m.clienteId));
}

/** La edad de los clientes activos hoy, por rangos. «Sin dato» solo si hay. */
export function perfilEdades(d: DatosEstadisticas, activos: Set<string>, hoy: string) {
  const edades = RANGOS_EDAD.map(([etiqueta]) => ({ etiqueta, n: 0 }));
  let sinDato = 0;
  let total = 0;
  for (const c of d.clientes) {
    if (!activos.has(c.id)) continue;
    total++;
    const e = c.nacimiento ? edad(c.nacimiento, hoy) : null;
    const i = e === null ? -1 : RANGOS_EDAD.findIndex(([, min, max]) => e >= min && e <= max);
    if (i < 0) sinDato++;
    else edades[i].n++;
  }
  if (sinDato) edades.push({ etiqueta: "Sin dato", n: sinDato });
  return { total, edades };
}

// ---------------------------------------------------------------------------
// Clases (propio de Reforme: la demo no tiene agenda)
// ---------------------------------------------------------------------------

/** Ventana de las estadísticas de clases: las últimas 4 semanas ya pasadas. */
export const SEMANAS_CLASES = 4;
/** Sin reservar en estos días (ni hacia atrás ni hacia delante): «dormido». */
export const DIAS_DORMIDO = 14;

export type CeldaHorario = { clases: number; reservas: number; cupos: number; ocupacion: number | null };

/**
 * Lo que ya pasó en las últimas 4 semanas, sin canceladas. Son RESERVAS, no
 * asistencias: todavía no se registra quién viene.
 */
function pasadas(clases: ClaseEnAgenda[], hoy: string) {
  const desde = sumarDias(hoy, -7 * SEMANAS_CLASES);
  return clases.filter((c) => !c.cancelada && c.fecha >= desde && c.fecha < hoy);
}

/**
 * Mapa día × hora: ocupación media de cada franja. Responde a «¿abro otra
 * clase a las 18:00 o quito la de las 9:00?». Las horas y los días salen de
 * lo que hay programado; un día sin ninguna clase no se pinta.
 */
export function mapaHorarios(clases: ClaseEnAgenda[], hoy: string) {
  const lista = pasadas(clases, hoy);
  const horas = [...new Set(lista.map((c) => c.horaInicio))].sort();
  const dias = [...new Set(lista.map((c) => diaSemana(c.fecha)))].sort((a, b) => a - b);
  const celdas = new Map<string, CeldaHorario>();
  for (const c of lista) {
    const clave = `${diaSemana(c.fecha)}|${c.horaInicio}`;
    const k = celdas.get(clave) ?? { clases: 0, reservas: 0, cupos: 0, ocupacion: null };
    k.clases++;
    k.reservas += c.reservas;
    k.cupos += c.cupos;
    celdas.set(clave, k);
  }
  for (const k of celdas.values()) k.ocupacion = k.cupos ? Math.round((k.reservas / k.cupos) * 100) : null;
  return {
    dias: dias.map((i) => ({ indice: i, nombre: DIAS_CORTOS[i] })),
    horas,
    /** Clave «día|hora» («0|07:00»). Un objeto y no un `Map` ni una
     *  función: viaja del servidor al navegador. */
    celdas: Object.fromEntries(celdas) as Record<string, CeldaHorario>,
  };
}

export type FilaOcupacion = { nombre: string; clases: number; reservas: number; ocupacion: number | null };

/** Ocupación de las últimas 4 semanas agrupada por lo que diga `clave`. */
export function ocupacionPor(
  clases: ClaseEnAgenda[],
  hoy: string,
  clave: (c: ClaseEnAgenda) => string,
): FilaOcupacion[] {
  const filas = new Map<string, { clases: number; reservas: number; cupos: number }>();
  for (const c of pasadas(clases, hoy)) {
    const k = clave(c);
    const f = filas.get(k) ?? { clases: 0, reservas: 0, cupos: 0 };
    f.clases++;
    f.reservas += c.reservas;
    f.cupos += c.cupos;
    filas.set(k, f);
  }
  return [...filas]
    .map(([nombre, f]) => ({
      nombre,
      clases: f.clases,
      reservas: f.reservas,
      ocupacion: f.cupos ? Math.round((f.reservas / f.cupos) * 100) : null,
    }))
    .sort((a, b) => b.clases - a.clases || a.nombre.localeCompare(b.nombre, "es"));
}

/**
 * Clientes «dormidos»: tienen el plan vigente pero no han reservado en los
 * últimos 14 días ni tienen nada reservado para los próximos 14. Es la señal
 * más temprana de que alguien no va a renovar, antes de que aparezca en «por
 * vencer».
 */
export function dormidos(
  clases: ClaseEnAgenda[],
  activos: Set<string>,
  hoy: string,
): { clienteId: string; ultima: string | null }[] {
  const desde = sumarDias(hoy, -DIAS_DORMIDO);
  const hasta = sumarDias(hoy, DIAS_DORMIDO);
  const recientes = new Set<string>();
  const ultima = new Map<string, string>();
  for (const c of clases) {
    if (c.cancelada) continue;
    for (const r of c.reservados) {
      if (c.fecha >= desde && c.fecha <= hasta) recientes.add(r.clienteId);
      if (c.fecha < hoy && (ultima.get(r.clienteId) ?? "") < c.fecha) ultima.set(r.clienteId, c.fecha);
    }
  }
  return [...activos]
    .filter((id) => !recientes.has(id))
    .map((id) => ({ clienteId: id, ultima: ultima.get(id) ?? null }))
    .sort((a, b) => (a.ultima ?? "").localeCompare(b.ultima ?? ""));
}

export type FilaUsoPlan = {
  plan: string;
  clientes: number;
  /** Reservas por semana y cliente, de media en las últimas 4 semanas. */
  porSemana: number | null;
  /** Clases por semana que incluye el plan; `null` = ilimitadas. */
  incluyePorSemana: number | null;
};

/**
 * Cuánto usan su plan los clientes activos: reservas por semana frente a lo
 * que el plan incluye. Un plan que se usa muy por debajo de lo que incluye
 * está mal dimensionado (o sus clientes se están enfriando).
 */
export function usoPorPlan(
  d: DatosEstadisticas,
  clases: ClaseEnAgenda[],
  hoy: string,
): FilaUsoPlan[] {
  const planes = new Map(d.planes.map((p) => [p.id, p]));
  const planDeHoy = new Map<string, string>();
  for (const m of [...d.membresias].sort((a, b) => a.inicio.localeCompare(b.inicio))) {
    if (m.inicio <= hoy && hoy <= m.vencimiento) planDeHoy.set(m.clienteId, m.planId);
  }
  const reservasDe = new Map<string, number>();
  for (const c of pasadas(clases, hoy)) {
    for (const r of c.reservados) reservasDe.set(r.clienteId, (reservasDe.get(r.clienteId) ?? 0) + 1);
  }
  const filas = new Map<string, { clientes: number; reservas: number }>();
  for (const [cliente, planId] of planDeHoy) {
    const f = filas.get(planId) ?? { clientes: 0, reservas: 0 };
    f.clientes++;
    f.reservas += reservasDe.get(cliente) ?? 0;
    filas.set(planId, f);
  }
  return [...filas]
    .map(([planId, f]) => {
      const p = planes.get(planId);
      return {
        plan: p?.nombre ?? "Plan eliminado",
        clientes: f.clientes,
        porSemana: f.clientes ? Math.round((f.reservas / f.clientes / SEMANAS_CLASES) * 10) / 10 : null,
        incluyePorSemana:
          p && p.clasesIncluidas !== null
            ? Math.round((p.clasesIncluidas / (p.vigenciaDias / 7)) * 10) / 10
            : null,
      };
    })
    .sort((a, b) => b.clientes - a.clientes);
}
