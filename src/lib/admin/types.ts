/**
 * Tipos de dominio del panel administrativo.
 *
 * Son la frontera entre la UI y los datos: hoy los sirve `mock.ts` con datos
 * de ejemplo, mañana los servirá la base de datos. Mientras estos tipos no
 * cambien, la interfaz no se entera de dónde vienen.
 *
 * Todos los importes van en **pesos colombianos (COP), en unidades enteras**
 * (no centavos): 250000 = $250.000.
 */

/** Métodos de cobro reales del estudio. Nequi y las transferencias bancarias
 *  pesan mucho en Colombia, por eso van separadas de "tarjeta". */
export type MetodoPago = "Efectivo" | "Nequi" | "Transferencia" | "Tarjeta";

/** Modalidades que vende el estudio. Máximo 4: es también el límite de series
 *  que admite la paleta de gráficos. */
export type TipoPlan =
  | "Mensual"
  | "Trimestral"
  | "Pack 10 clases"
  | "Clase suelta";

export type CategoriaGasto =
  | "Arriendo"
  | "Nómina"
  | "Servicios"
  | "Mantenimiento"
  | "Marketing";

/** Un mes cerrado de la contabilidad. `mes` es la etiqueta corta ("Ene"). */
export type MesFinanciero = {
  mes: string;
  /** Año, para desambiguar cuando la serie cruza de diciembre a enero */
  anio: number;
  ingresos: number;
  gastos: number;
};

export type RepartoPlan = {
  plan: TipoPlan;
  importe: number;
  /** Nº de clientes en esa modalidad */
  clientes: number;
};

export type RepartoMetodoPago = {
  metodo: MetodoPago;
  importe: number;
};

export type GastoCategoria = {
  categoria: CategoriaGasto;
  importe: number;
  /** Presupuesto asignado al mes, para ver desviación */
  presupuesto: number;
};

export type MovimientoClientes = {
  mes: string;
  altas: number;
  bajas: number;
};

/** Membresía que caduca pronto: ingreso en riesgo + lista accionable para
 *  llamar antes de que se enfríe el cliente. */
export type MembresiaPorVencer = {
  id: string;
  cliente: string;
  plan: TipoPlan;
  /** Días que faltan para el vencimiento (0 = vence hoy) */
  diasRestantes: number;
  /** Lo que se deja de ingresar si no renueva */
  importeRenovacion: number;
};

/** Tramos de antigüedad de cartera, el estándar contable. */
export type TramoCartera = "1-30 días" | "31-60 días" | "Más de 60 días";

export type CarteraVencida = {
  tramo: TramoCartera;
  importe: number;
  /** Nº de clientes con deuda en ese tramo */
  clientes: number;
};

/** Cifra de cabecera: un número grande con su variación. */
export type Indicador = {
  etiqueta: string;
  valor: number;
  /** Cómo se pinta el valor */
  formato: "moneda" | "numero" | "porcentaje";
  /** Variación vs. el periodo anterior, en puntos porcentuales. `null` cuando
   *  no hay periodo con el que comparar. */
  variacion: number | null;
  /** Si subir es bueno. En cartera pendiente, por ejemplo, subir es malo. */
  subirEsBueno: boolean;
  /** Aclaración corta bajo el número */
  detalle: string;
};
