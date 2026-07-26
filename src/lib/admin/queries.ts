import { calcularVariacion } from "./format";
import {
  CARTERA,
  CLIENTES,
  EQUIPO,
  GASTOS,
  MEMBRESIAS_POR_VENCER,
  MESES,
  MOVIMIENTO_CLIENTES,
  REPARTO_METODOS,
  REPARTO_PLANES,
  RESUMEN,
} from "./mock";
import type { Cliente, EstadoMembresia, Indicador, MiembroEquipo } from "./types";

/**
 * Única puerta de entrada a los datos del panel.
 *
 * La UI llama SIEMPRE a estas funciones, nunca a `mock.ts` directamente. El día
 * que haya base de datos, se cambia el cuerpo de estas funciones (pasarán a ser
 * `async` y harán la consulta) y las pantallas no se tocan.
 */

export function getMesesFinancieros() {
  return MESES;
}

export function getRepartoPlanes() {
  return REPARTO_PLANES;
}

export function getRepartoMetodos() {
  return REPARTO_METODOS;
}

export function getGastos() {
  return GASTOS;
}

export function getMovimientoClientes() {
  return MOVIMIENTO_CLIENTES;
}

export function getCartera() {
  return CARTERA;
}

/** La base de clientes, ordenada alfabéticamente. Es el orden por defecto de
 *  `/admin/usuarios`; los demás criterios los aplica la propia pantalla. */
export function getClientes(): Cliente[] {
  return [...CLIENTES].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export function getEquipo(): MiembroEquipo[] {
  return [...EQUIPO].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/**
 * Cuántos clientes hay en cada estado, más el total.
 *
 * Va aquí y no en la pantalla porque es un dato del dominio: los recuentos que
 * se enseñan dentro de los filtros son los mismos que alimentan el dashboard.
 */
export function getConteoEstados(): Record<EstadoMembresia | "Todas", number> {
  const conteo: Record<EstadoMembresia | "Todas", number> = {
    Todas: CLIENTES.length,
    Activa: 0,
    "Por vencer": 0,
    Vencida: 0,
    Inactiva: 0,
  };
  for (const c of CLIENTES) conteo[c.estado] += 1;
  return conteo;
}

/**
 * Horizonte de "por vencer" del indicador de cabecera: una semana. Es el plazo
 * en el que todavía da tiempo a llamar al cliente antes de que se le caiga la
 * membresía.
 */
export const DIAS_POR_VENCER = 7;

/** Membresías que vencen dentro de `dias`, de la más urgente a la menos. */
export function getMembresiasPorVencer(dias = 15) {
  return MEMBRESIAS_POR_VENCER.filter((m) => m.diasRestantes <= dias).sort(
    (a, b) => a.diasRestantes - b.diasRestantes,
  );
}

export function getTotalCartera() {
  return CARTERA.reduce((t, c) => t + c.importe, 0);
}

export function getIngresoEnRiesgo(dias = 7) {
  return getMembresiasPorVencer(dias).reduce(
    (t, m) => t + m.importeRenovacion,
    0,
  );
}

/** Utilidad = ingresos − gastos, mes a mes. */
export function getUtilidadMensual() {
  return MESES.map((m) => ({
    mes: m.mes,
    utilidad: m.ingresos - m.gastos,
  }));
}

/**
 * Las cuatro cifras de cabecera: lo que la administración mira primero.
 * Responden "¿cómo vamos de plata?" — facturación, utilidad, tamaño de la base
 * de clientes y qué hay que renovar esta semana.
 */
export function getIndicadores(): Indicador[] {
  const actual = MESES[MESES.length - 1];
  const anterior = MESES[MESES.length - 2];
  const utilidad = actual.ingresos - actual.gastos;
  const utilidadAnterior = anterior.ingresos - anterior.gastos;

  return [
    {
      // "por mes" y no "del mes": la tarjeta ya no muestra solo la cifra del
      // mes en curso, sino la serie. El mes concreto al que se refiere el
      // número grande lo dice `detalle` ("Jul 2026 · frente a Jun").
      etiqueta: "Ingresos por mes",
      valor: actual.ingresos,
      formato: "moneda",
      variacion: calcularVariacion(actual.ingresos, anterior.ingresos),
      subirEsBueno: true,
      detalle: `${actual.mes} ${actual.anio} · frente a ${anterior.mes}`,
    },
    {
      etiqueta: "Utilidad del mes",
      valor: utilidad,
      formato: "moneda",
      variacion: calcularVariacion(utilidad, utilidadAnterior),
      subirEsBueno: true,
      detalle: "Ingresos menos gastos",
    },
    {
      etiqueta: "Clientes activos",
      valor: RESUMEN.clientesActivos,
      formato: "numero",
      variacion: calcularVariacion(
        RESUMEN.clientesActivos,
        RESUMEN.clientesActivosMesAnterior,
      ),
      subirEsBueno: true,
      detalle: `${RESUMEN.clientesInactivos30d} sin reservar hace 30 días`,
    },
    {
      // OJO: no es la cartera vencida (dinero que ya se debe), sino la que
      // está A PUNTO de vencer: lo que hay que renovar esta semana. Es un
      // aviso accionable, no un pasivo.
      etiqueta: "Cartera por vencer",
      valor: getIngresoEnRiesgo(DIAS_POR_VENCER),
      formato: "moneda",
      variacion: null,
      // Que suba significa más plata pendiente de renovar: no es buena noticia.
      subirEsBueno: false,
      detalle: `${getMembresiasPorVencer(DIAS_POR_VENCER).length} clientes por vencer`,
    },
  ];
}

export function getTasaRenovacion() {
  return {
    valor: RESUMEN.tasaRenovacion,
    variacion: calcularVariacion(
      RESUMEN.tasaRenovacion,
      RESUMEN.tasaRenovacionMesAnterior,
    ),
  };
}
