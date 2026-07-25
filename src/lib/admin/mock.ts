import type {
  CarteraVencida,
  GastoCategoria,
  MembresiaPorVencer,
  MesFinanciero,
  MovimientoClientes,
  RepartoMetodoPago,
  RepartoPlan,
} from "./types";

/**
 * DATOS DE EJEMPLO — no son reales.
 *
 * Están calibrados para que el panel se vea creíble mientras no hay backend:
 * un estudio pequeño de Florencia con ~90 clientes activos, ticket medio en
 * torno a $180.000 COP y una estacionalidad plausible (enero fuerte por
 * propósitos de año nuevo, bajón en vacaciones de mitad de año).
 *
 * ÚNICO archivo que hay que sustituir cuando llegue la base de datos:
 * `queries.ts` seguirá exponiendo las mismas funciones.
 */

export const MESES: MesFinanciero[] = [
  { mes: "Ago", anio: 2025, ingresos: 12_400_000, gastos: 9_800_000 },
  { mes: "Sep", anio: 2025, ingresos: 13_100_000, gastos: 9_950_000 },
  { mes: "Oct", anio: 2025, ingresos: 14_050_000, gastos: 10_200_000 },
  { mes: "Nov", anio: 2025, ingresos: 15_200_000, gastos: 10_400_000 },
  { mes: "Dic", anio: 2025, ingresos: 13_600_000, gastos: 11_800_000 },
  { mes: "Ene", anio: 2026, ingresos: 18_900_000, gastos: 10_900_000 },
  { mes: "Feb", anio: 2026, ingresos: 17_450_000, gastos: 10_600_000 },
  { mes: "Mar", anio: 2026, ingresos: 16_800_000, gastos: 10_750_000 },
  { mes: "Abr", anio: 2026, ingresos: 15_900_000, gastos: 10_500_000 },
  { mes: "May", anio: 2026, ingresos: 14_700_000, gastos: 10_300_000 },
  { mes: "Jun", anio: 2026, ingresos: 15_500_000, gastos: 10_450_000 },
  { mes: "Jul", anio: 2026, ingresos: 16_950_000, gastos: 10_800_000 },
];

export const REPARTO_PLANES: RepartoPlan[] = [
  { plan: "Mensual", importe: 8_600_000, clientes: 47 },
  { plan: "Trimestral", importe: 5_100_000, clientes: 19 },
  { plan: "Pack 10 clases", importe: 2_300_000, clientes: 21 },
  { plan: "Clase suelta", importe: 950_000, clientes: 34 },
];

export const REPARTO_METODOS: RepartoMetodoPago[] = [
  { metodo: "Nequi", importe: 6_800_000 },
  { metodo: "Transferencia", importe: 5_200_000 },
  { metodo: "Efectivo", importe: 3_150_000 },
  { metodo: "Tarjeta", importe: 1_800_000 },
];

export const GASTOS: GastoCategoria[] = [
  { categoria: "Arriendo", importe: 4_200_000, presupuesto: 4_200_000 },
  { categoria: "Nómina", importe: 4_600_000, presupuesto: 4_400_000 },
  { categoria: "Servicios", importe: 850_000, presupuesto: 900_000 },
  { categoria: "Mantenimiento", importe: 780_000, presupuesto: 600_000 },
  { categoria: "Marketing", importe: 370_000, presupuesto: 500_000 },
];

export const MOVIMIENTO_CLIENTES: MovimientoClientes[] = [
  { mes: "Feb", altas: 14, bajas: 6 },
  { mes: "Mar", altas: 11, bajas: 8 },
  { mes: "Abr", altas: 9, bajas: 7 },
  { mes: "May", altas: 8, bajas: 11 },
  { mes: "Jun", altas: 12, bajas: 5 },
  { mes: "Jul", altas: 15, bajas: 6 },
];

export const MEMBRESIAS_POR_VENCER: MembresiaPorVencer[] = [
  {
    id: "m1",
    cliente: "Laura Gutiérrez",
    plan: "Mensual",
    diasRestantes: 0,
    importeRenovacion: 190_000,
  },
  {
    id: "m2",
    cliente: "Andrés Ramírez",
    plan: "Trimestral",
    diasRestantes: 2,
    importeRenovacion: 510_000,
  },
  {
    id: "m3",
    cliente: "Valentina Ospina",
    plan: "Mensual",
    diasRestantes: 3,
    importeRenovacion: 190_000,
  },
  {
    id: "m4",
    cliente: "Camila Trujillo",
    plan: "Pack 10 clases",
    diasRestantes: 5,
    importeRenovacion: 320_000,
  },
  {
    id: "m5",
    cliente: "Juan Pablo Cortés",
    plan: "Mensual",
    diasRestantes: 6,
    importeRenovacion: 190_000,
  },
  {
    id: "m6",
    cliente: "Daniela Peña",
    plan: "Mensual",
    diasRestantes: 9,
    importeRenovacion: 190_000,
  },
  {
    id: "m7",
    cliente: "Mariana Losada",
    plan: "Trimestral",
    diasRestantes: 12,
    importeRenovacion: 510_000,
  },
];

export const CARTERA: CarteraVencida[] = [
  { tramo: "1-30 días", importe: 1_240_000, clientes: 7 },
  { tramo: "31-60 días", importe: 680_000, clientes: 3 },
  { tramo: "Más de 60 días", importe: 415_000, clientes: 2 },
];

/** Instantánea del mes en curso. */
export const RESUMEN = {
  clientesActivos: 94,
  clientesActivosMesAnterior: 88,
  clientesInactivos30d: 12,
  /** Renovaciones logradas sobre membresías vencidas, en % */
  tasaRenovacion: 78.5,
  tasaRenovacionMesAnterior: 74.2,
};
