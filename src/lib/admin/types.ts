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

/**
 * Estado de la membresía de un cliente. Es **un solo estado por cliente**, no
 * una combinación: los cuatro son excluyentes y suman el total de la base.
 *
 * - `Activa`     — al día, le quedan más de 15 días.
 * - `Por vencer` — vence dentro de 15 días. Sigue contando como cliente activo.
 * - `Vencida`    — caducó y no ha renovado: es la cartera vencida.
 * - `Inactiva`   — sin reservar desde hace más de 30 días.
 *
 * De aquí salen dos cifras del dashboard: **clientes activos** = `Activa` +
 * `Por vencer`, y **inactivos 30d** = `Inactiva`.
 */
export type EstadoMembresia = "Activa" | "Por vencer" | "Vencida" | "Inactiva";

/**
 * Una persona que entrena en el estudio.
 *
 * Las fechas van en ISO corto (`"2026-07-25"`) y **no en `Date`**: los objetos
 * `Date` no cruzan la frontera servidor→cliente de React, y una cadena ISO se
 * ordena igual de bien alfabéticamente que cronológicamente.
 */
export type Cliente = {
  id: string;
  nombre: string;
  /**
   * Cédula de ciudadanía, **solo dígitos y sin puntos**. Es el identificador por
   * el que se busca a una persona en recepción, así que se guarda en crudo y los
   * puntos los pone `documento()` al pintarlo: si se guardaran formateados,
   * buscar «1045» no encontraría a «1.045.678.912».
   */
  identificacion: string;
  correo: string;
  /** Formato colombiano "+57 320 907 8814" */
  telefono: string;
  plan: TipoPlan;
  estado: EstadoMembresia;
  /** Vencimiento de la membresía vigente, ISO corto. */
  vencimiento: string;
  /** Alta en el estudio, ISO corto. */
  alta: string;
  /** Última clase a la que asistió, o `null` si nunca vino. */
  ultimaAsistencia: string | null;
  /** Lo que cuesta renovar su plan, COP entero. */
  importeRenovacion: number;
};

export type TipoIdentificacion =
  | "C.C."
  | "T.I."
  | "C.E."
  | "Pasaporte"
  | "R.C.";

export type ContactoEmergencia = {
  nombre: string;
  /** Dígitos en crudo, sin prefijo ni espacios. */
  telefono: string;
};

/** El acudiente de un menor. Solo existe si la persona era menor al darse de alta. */
export type Acudiente = {
  nombre: string;
  identificacion: string;
  telefono: string;
};

/**
 * Lo que se rellena en recepción al dar de alta a alguien.
 *
 * ⚠️ **No es un `Cliente`, y es a propósito.** Un `Cliente` necesita plan,
 * estado, vencimiento e importe, y el alta **no pregunta por el plan**: se asigna
 * después. Como además hoy no hay backend ni mutador, nada de esto entra en
 * `CLIENTES`, así que no hace falta forzar la forma de `Cliente` ni volver sus
 * campos opcionales — que habría roto la columna de plan del listado, su filtro,
 * `REPARTO_PLANES` y el CSV.
 *
 * El día que haya base de datos, `crearCliente(ficha)` mapeará ficha → cliente y
 * será ahí donde se elija el plan.
 */
export type FichaAlta = {
  nombre: string;
  tipoIdentificacion: TipoIdentificacion;
  /** Dígitos en crudo (o alfanumérico en pasaporte), sin puntos. */
  identificacion: string;
  /** ISO corto. */
  fechaNacimiento: string;
  telefono: string;
  /** Cadena vacía si no lo dio: el correo es opcional. */
  correo: string;
  eps: string;
  contactoEmergencia: ContactoEmergencia;
  /** Solo si es menor de edad. */
  acudiente?: Acudiente;
  /** Lo acepta el cliente, o su acudiente si es menor. */
  aceptaTerminos: boolean;
};

export type RolEquipo = "Instructora" | "Administración" | "Recepción";

export type MiembroEquipo = {
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
  rol: RolEquipo;
  /** Clases que imparte a la semana. 0 en los roles que no dan clase. */
  clasesSemana: number;
  activo: boolean;
  alta: string;
};

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

/**
 * Una modalidad del catálogo, con sus condiciones de venta.
 *
 * ⚠️ **El precio y el número de clientes NO se escriben aquí**: el precio sale
 * de `PRECIO_PLAN` (el mismo que cobra cada cliente) y los clientes se cuentan
 * sobre `CLIENTES`. Si el catálogo los guardara por su cuenta, la pantalla de
 * Planes podría decir «$190.000 · 47 clientes» mientras el listado de Usuarios
 * enseña otro precio y otro recuento. Aquí solo vive lo que no se puede
 * deducir de ningún otro sitio: la vigencia y las clases incluidas.
 */
export type CondicionesPlan = {
  plan: TipoPlan;
  /** Días que dura la membresía desde que se paga. */
  vigenciaDias: number;
  /** Clases incluidas, o `null` si son ilimitadas dentro de la vigencia. */
  clasesIncluidas: number | null;
  /** Si se puede vender hoy. Un plan retirado conserva sus clientes vigentes. */
  seVende: boolean;
  /** Para quién es, en una línea. */
  descripcion: string;
};

/** Una fila de la pantalla de Planes: condiciones + lo que ha pasado con ellas. */
export type PlanConMetricas = CondicionesPlan & {
  precio: number;
  /** Clientes que lo tienen ahora mismo, contados sobre `CLIENTES`. */
  clientes: number;
  /** Lo que factura al mes ese plan según el reparto de ingresos. */
  facturacionMes: number;
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

/**
 * Un pago cobrado por el estudio.
 *
 * ⚠️ **Se DERIVA de `CLIENTES`, no se escribe a mano.** Cada pago es la
 * renovación que ya consta en la ficha de un cliente: mismo plan, mismo
 * importe (`PRECIO_PLAN`) y una fecha coherente con su vencimiento. Escrito
 * aparte, el libro sumaría una cosa y el reparto por método otra — que es
 * exactamente el problema que tenían los 121 clientes de `REPARTO_PLANES`.
 */
export type Pago = {
  id: string;
  /** Id del cliente, para enlazar a su ficha. */
  clienteId: string;
  cliente: string;
  plan: TipoPlan;
  metodo: MetodoPago;
  /** ISO corto. */
  fecha: string;
  importe: number;
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

/**
 * Quién ha entrado al panel.
 *
 * ⚠️ **Hoy es un dato inventado, no una sesión.** `/admin` no está protegido y
 * el reparto por rol del login (dominio `@reforme.com`) es un marcador, no
 * autenticación. Existe como tipo para que el día que haya auth real solo
 * cambie de dónde sale, no quién lo consume.
 */
export type UsuarioActual = {
  nombre: string;
  correo: string;
  /** Lo que se enseña bajo el nombre: «Administradora», «Recepción»… */
  rol: string;
};

/**
 * Aviso de la campana de la cabecera.
 *
 * ⚠️ **`tipo` no es el color, es el MOTIVO.** El color lo decide la cabecera a
 * partir de él: si el tipo fuera un color, cambiar la paleta obligaría a tocar
 * los datos. Y nunca va solo — cada aviso lleva también su texto.
 */
export type TipoNotificacion = "aviso" | "info" | "ok";

export type Notificacion = {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  detalle: string;
  /** Cuándo pasó, ya redactado («hace 2 h», «ayer»). ⚠️ Texto y no fecha a
   *  propósito mientras no haya backend: con una fecha habría que calcular el
   *  «hace tanto» en cliente, y el panel se prerenderiza en el build — el
   *  servidor y el navegador dirían cosas distintas (error de hidratación). */
  cuando: string;
  leida: boolean;
  /** A dónde lleva al pulsarla. */
  href: string;
};
