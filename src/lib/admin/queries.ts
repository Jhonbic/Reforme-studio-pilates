import { calcularVariacion } from "./format";
import {
  CARTERA,
  GASTOS,
  MEMBRESIAS_POR_VENCER,
  MESES,
  MOVIMIENTO_CLIENTES,
  REPARTO_METODOS,
  REPARTO_PLANES,
  RESUMEN,
} from "./mock";
import type { Indicador } from "./types";

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
 * Se eligieron para responder "¿cómo vamos de plata?" — facturación, tamaño de
 * la base de clientes, dinero sin cobrar y capacidad de retener.
 */
export function getIndicadores(): Indicador[] {
  const actual = MESES[MESES.length - 1];
  const anterior = MESES[MESES.length - 2];
  const utilidad = actual.ingresos - actual.gastos;
  const utilidadAnterior = anterior.ingresos - anterior.gastos;

  return [
    {
      etiqueta: "Ingresos del mes",
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
      etiqueta: "Cartera pendiente",
      valor: getTotalCartera(),
      formato: "moneda",
      variacion: null,
      subirEsBueno: false,
      detalle: `${CARTERA.reduce((t, c) => t + c.clientes, 0)} clientes con pagos vencidos`,
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
