import type {
  Cliente,
  CondicionesPlan,
  EstadoMembresia,
  GastoCategoria,
  MembresiaPorVencer,
  MesFinanciero,
  MetodoPago,
  MiembroEquipo,
  MovimientoClientes,
  Notificacion,
  Pago,
  RepartoMetodoPago,
  RepartoPlan,
  TipoPlan,
  UsuarioActual,
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

/**
 * Fecha de referencia del panel. **No se usa `Date.now()` a propósito:** las
 * páginas se renderizan en el servidor durante el build, así que un "hoy" real
 * haría que los días restantes cambiaran en cada despliegue y que el HTML del
 * servidor no coincidiera con el del cliente. Cuando haya base de datos, este
 * es el punto donde entra la fecha real.
 */
export const HOY = "2026-07-25";

/** Suma (o resta, con negativos) días a una fecha ISO corta. En UTC, para que
 *  el huso horario no desplace nunca el día. */
export function sumarDias(iso: string, dias: number): string {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + dias))
    .toISOString()
    .slice(0, 10);
}

/** Días desde `HOY` hasta la fecha dada. Negativo si ya pasó. */
export function diasHasta(iso: string): number {
  const ms = Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${HOY}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Precio de renovación por modalidad. Son los mismos importes que ya usaban
 *  las membresías por vencer, para no contradecir al dashboard.
 *
 *  ⚠️ Se **exporta** desde que existe la pantalla de Planes: es el único sitio
 *  donde vive un precio, y esa pantalla lo enseña en vez de guardar el suyo. */
export const PRECIO_PLAN: Record<TipoPlan, number> = {
  Mensual: 190_000,
  Trimestral: 510_000,
  "Pack 10 clases": 320_000,
  "Clase suelta": 35_000,
};

/**
 * Condiciones de venta de cada modalidad.
 *
 * ⚠️ **Sin precio ni número de clientes a propósito.** El precio es
 * `PRECIO_PLAN` y los clientes se cuentan sobre `CLIENTES`; duplicarlos aquí
 * es exactamente cómo dos pantallas acaban diciendo cifras distintas. Aquí
 * solo está lo que no se puede deducir de ningún otro sitio.
 *
 * La vigencia de «Clase suelta» es 1 día porque se consume el mismo día que se
 * compra: no es una membresía, es una entrada.
 */
export const CONDICIONES_PLANES: CondicionesPlan[] = [
  {
    plan: "Mensual",
    vigenciaDias: 30,
    clasesIncluidas: null,
    seVende: true,
    descripcion: "Para quien entrena de forma constante todas las semanas.",
    caracteristicas: [
      "Reserva con 7 días de antelación",
      "Grupos de máximo 6 personas",
      "Valoración postural al empezar",
      "Congela hasta 7 días por viaje o enfermedad",
    ],
  },
  {
    plan: "Trimestral",
    vigenciaDias: 90,
    clasesIncluidas: null,
    seVende: true,
    descripcion: "Tres meses por adelantado, con descuento sobre el mensual.",
    caracteristicas: [
      "Todo lo del plan Mensual",
      "Ahorro de $60.000 frente a pagar mes a mes",
      "Reserva con 14 días de antelación",
      "Congela hasta 15 días",
      "Una clase de invitado al trimestre",
    ],
  },
  {
    plan: "Pack 10 clases",
    vigenciaDias: 60,
    clasesIncluidas: 10,
    seVende: true,
    descripcion: "Diez clases para usar cuando se pueda, sin atarse al mes.",
    caracteristicas: [
      "Sin días fijos: se reserva según agenda",
      "Grupos de máximo 6 personas",
      "Transferible a otra persona una vez",
    ],
  },
  {
    plan: "Clase suelta",
    vigenciaDias: 1,
    clasesIncluidas: 1,
    seVende: true,
    descripcion: "Una clase para probar el estudio o para quien está de paso.",
    caracteristicas: [
      "Sin compromiso ni matrícula",
      "Se descuenta si se contrata un plan esa semana",
    ],
  },
];

/** Vigencia por plan, indexada. Se DERIVA del catálogo en vez de repetirse:
 *  si un plan cambia de duración, solo se toca `CONDICIONES_PLANES`. */
const VIGENCIA_PLAN = Object.fromEntries(
  CONDICIONES_PLANES.map((c) => [c.plan, c.vigenciaDias]),
) as Record<TipoPlan, number>;

const NOMBRES = [
  "Laura", "Andrés", "Valentina", "Camila", "Santiago", "Daniela",
  "Mariana", "Sebastián", "Isabella", "Nicolás", "Paula", "Felipe",
  "Sofía", "Julián", "Carolina", "Esteban", "Manuela", "Ricardo",
  "Alejandra", "Óscar", "Natalia", "Diego", "Catalina", "Mauricio",
];

/** Ojo: no incluye los apellidos de los siete clientes escritos a mano abajo,
 *  así ninguna combinación generada puede repetir uno de esos nombres. */
const APELLIDOS = [
  "Moreno", "Cárdenas", "Beltrán", "Quintero", "Hincapié", "Vargas",
  "Zuluaga", "Betancourt", "Arboleda", "Restrepo", "Salazar", "Muñoz",
  "Rojas", "Villamil", "Cifuentes", "Perdomo", "Escobar", "Orozco",
  "Calderón", "Bermúdez", "Naranjo", "Sanabria", "Guerrero",
];

function correoDe(nombre: string): string {
  const limpio = nombre
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .split(" ");
  return `${limpio[0]}.${limpio[limpio.length - 1]}@correo.com`;
}

/**
 * Cédula verosímil y estable por índice. Las colombianas modernas son de 10
 * dígitos empezando por 1; las de la generación anterior, de 8 empezando por 3 o
 * 4 — se alternan para que el listado no parezca una sola cohorte de edad.
 */
function cedulaDe(i: number): string {
  return i % 5 === 0
    ? String(40_000_000 + ((i * 3_167_419) % 19_999_999))
    : String(1_000_000_000 + ((i * 61_803_399) % 199_999_999));
}

function telefonoDe(i: number): string {
  const n = String(3_000_000_000 + ((i * 79_193_117) % 999_999_999));
  return `+57 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
}

/**
 * Genera `n` clientes en un estado dado. Todo sale de aritmética modular sobre
 * el índice: los datos son variados pero **idénticos en cada build**, que es
 * justo lo que hace falta para un panel que se renderiza en el servidor.
 *
 * Las parejas nombre/apellido no se repiten nunca: 24 y 23 son primos entre sí,
 * así que la combinación no vuelve a salir hasta la vuelta 552.
 */
function generarClientes(
  n: number,
  estado: EstadoMembresia,
  desde: number,
): Cliente[] {
  return Array.from({ length: n }, (_, k) => {
    const i = desde + k;
    const nombre = `${NOMBRES[i % NOMBRES.length]} ${APELLIDOS[(i * 5) % APELLIDOS.length]}`;
    const plan = (Object.keys(PRECIO_PLAN) as TipoPlan[])[(i * 3) % 4];

    // Rangos por estado: una membresía vencida hace 40 días y una activa que
    // renovó ayer no pueden compartir el mismo reparto de fechas.
    const vencimiento =
      estado === "Activa"
        ? sumarDias(HOY, 16 + ((i * 11) % 105))
        : estado === "Vencida"
          ? sumarDias(HOY, -(3 + ((i * 7) % 68)))
          : sumarDias(HOY, -(35 + ((i * 13) % 116)));

    const ultimaAsistencia =
      estado === "Activa"
        ? sumarDias(HOY, -((i * 3) % 7))
        : estado === "Vencida"
          ? sumarDias(vencimiento, -((i * 2) % 6))
          : sumarDias(HOY, -(31 + ((i * 17) % 90)));

    return {
      id: `c-${String(i + 1).padStart(3, "0")}`,
      nombre,
      identificacion: cedulaDe(i + 1),
      correo: correoDe(nombre),
      telefono: telefonoDe(i),
      plan,
      estado,
      vencimiento,
      alta: sumarDias(HOY, -(60 + ((i * 23) % 840))),
      ultimaAsistencia,
      importeRenovacion: PRECIO_PLAN[plan],
    };
  });
}

/**
 * Las siete membresías a punto de caducar, escritas a mano porque son las que
 * el dashboard ya venía mostrando: sus nombres, planes e importes no pueden
 * cambiar sin cambiar la cifra de «Cartera por vencer».
 */
const POR_VENCER: Cliente[] = (
  [
    ["Laura Gutiérrez", "Mensual", 0],
    ["Andrés Ramírez", "Trimestral", 2],
    ["Valentina Ospina", "Mensual", 3],
    ["Camila Trujillo", "Pack 10 clases", 5],
    ["Juan Pablo Cortés", "Mensual", 6],
    ["Daniela Peña", "Mensual", 9],
    ["Mariana Losada", "Trimestral", 12],
  ] as [string, TipoPlan, number][]
).map(([nombre, plan, dias], i) => ({
  id: `c-${String(i + 1).padStart(3, "0")}`,
  nombre,
  identificacion: cedulaDe(i + 1),
  correo: correoDe(nombre),
  telefono: telefonoDe(i),
  plan,
  estado: "Por vencer" as const,
  vencimiento: sumarDias(HOY, dias),
  alta: sumarDias(HOY, -(120 + i * 47)),
  ultimaAsistencia: sumarDias(HOY, -(i % 5)),
  importeRenovacion: PRECIO_PLAN[plan],
}));

/**
 * La base de clientes: **la fuente de verdad** de la que salen las membresías
 * por vencer y los recuentos del resumen. Antes eran listas independientes y
 * podían contradecirse entre el dashboard y esta pantalla.
 *
 * El reparto está calibrado para cuadrar con las cifras que ya se enseñaban:
 * 87 + 7 = 94 clientes activos, 12 inactivos a 30 días y 12 con cartera vencida
 * (los mismos 7 + 3 + 2 de `CARTERA`).
 */
export const CLIENTES: Cliente[] = [
  ...POR_VENCER,
  ...generarClientes(87, "Activa", 7),
  ...generarClientes(12, "Vencida", 94),
  ...generarClientes(12, "Inactiva", 106),
];

export const EQUIPO: MiembroEquipo[] = [
  {
    id: "e-01",
    nombre: "Ana María Solano",
    correo: "ana.solano@reforme.com",
    telefono: "+57 320 907 8814",
    rol: "Instructora",
    clasesSemana: 18,
    activo: true,
    alta: "2024-02-05",
  },
  {
    id: "e-02",
    nombre: "Juliana Bedoya",
    correo: "juliana.bedoya@reforme.com",
    telefono: "+57 311 442 9075",
    rol: "Instructora",
    clasesSemana: 15,
    activo: true,
    alta: "2024-06-17",
  },
  {
    id: "e-03",
    nombre: "Sara Montoya",
    correo: "sara.montoya@reforme.com",
    telefono: "+57 315 778 2043",
    rol: "Instructora",
    clasesSemana: 12,
    activo: true,
    alta: "2025-01-20",
  },
  {
    id: "e-04",
    nombre: "Tatiana Rivas",
    correo: "tatiana.rivas@reforme.com",
    telefono: "+57 318 205 6631",
    rol: "Instructora",
    clasesSemana: 8,
    activo: false,
    alta: "2025-08-11",
  },
  {
    id: "e-05",
    nombre: "Carolina Ceballos",
    correo: "carolina.ceballos@reforme.com",
    telefono: "+57 312 660 4419",
    rol: "Administración",
    clasesSemana: 0,
    activo: true,
    alta: "2023-11-02",
  },
  {
    id: "e-06",
    nombre: "Lina Pardo",
    correo: "lina.pardo@reforme.com",
    telefono: "+57 322 118 7350",
    rol: "Recepción",
    clasesSemana: 0,
    activo: true,
    alta: "2025-03-24",
  },
];

/** Derivadas de `CLIENTES`, no escritas aparte: si fueran dos listas, el
 *  dashboard y la pantalla de usuarios podrían decir cosas distintas. */
export const MEMBRESIAS_POR_VENCER: MembresiaPorVencer[] = CLIENTES.filter(
  (c) => c.estado === "Por vencer",
)
  .map((c) => ({
    id: `m-${c.id}`,
    cliente: c.nombre,
    plan: c.plan,
    diasRestantes: diasHasta(c.vencimiento),
    importeRenovacion: c.importeRenovacion,
  }))
  .sort((a, b) => a.diasRestantes - b.diasRestantes);

/* `CARTERA` (deuda vencida por tramos de antigüedad) vivía aquí y se borró con
   la tarjeta que la pintaba. Los 12 clientes con membresía vencida siguen en
   `CLIENTES`, así que el dato se puede reconstruir el día que vuelva a hacer
   falta — y entonces derivándolo de ahí, no escrito a mano como estaba. */

/* Reparto de métodos de cobro, en la misma proporción que `REPARTO_METODOS`:
   Nequi 4 de cada 10, Transferencia 3, Efectivo 2 y Tarjeta 1. Va como patrón
   fijo y no aleatorio porque el panel se prerenderiza: con `Math.random()`,
   cada build daría un libro distinto. */
const CICLO_METODOS: MetodoPago[] = [
  "Nequi",
  "Transferencia",
  "Nequi",
  "Efectivo",
  "Nequi",
  "Transferencia",
  "Tarjeta",
  "Nequi",
  "Transferencia",
  "Efectivo",
];

/**
 * Libro de pagos, **derivado de `CLIENTES`**.
 *
 * Cada entrada es el cobro que puso en marcha la membresía vigente de un
 * cliente: mismo plan y mismo importe que su ficha, y fecha = su vencimiento
 * menos la vigencia del plan. Así, abrir la ficha de alguien y buscarlo en el
 * libro nunca puede dar dos cifras distintas.
 *
 * ⚠️ **Su suma NO es `MESES[].ingresos`, y no debe leerse como si lo fuera.**
 * Los ingresos mensuales están escritos a mano en `MESES` e incluyen cobros de
 * meses anteriores; este libro solo contiene la última renovación de cada
 * cliente vigente. El día que haya base de datos, la relación se invierte: el
 * ingreso del mes se CALCULARÁ sumando pagos, y `MESES` desaparece.
 *
 * Los clientes con membresía vencida también aparecen: pagaron en su momento,
 * y su deuda actual es lo que cuenta `CARTERA`.
 *
 * ⚠️ **Se descartan los pagos que caerían en el futuro, y no es un capricho.**
 * `generarClientes` reparte el vencimiento por ESTADO (una membresía activa
 * vence dentro de 16 a 120 días) sin mirar la vigencia del plan, así que una
 * «Clase suelta» —que dura 1 día— puede acabar con vencimiento a cuatro meses.
 * Restarle su vigencia da una fecha de cobro posterior a hoy, y un pago futuro
 * no existe: sería el primero de la lista al ordenar por fecha.
 *
 * La alternativa era acotar la fecha a hoy, pero eso amontonaría decenas de
 * cobros en el mismo día y el libro parecería un error distinto. Con base de
 * datos el problema desaparece: el pago será un hecho registrado y el
 * vencimiento se calculará A PARTIR de él, nunca al revés.
 */
export const PAGOS: Pago[] = CLIENTES.map((c, i) => ({
  id: `p-${c.id}`,
  clienteId: c.id,
  cliente: c.nombre,
  plan: c.plan,
  metodo: CICLO_METODOS[i % CICLO_METODOS.length],
  fecha: sumarDias(c.vencimiento, -VIGENCIA_PLAN[c.plan]),
  importe: c.importeRenovacion,
}))
  .filter((p) => p.fecha <= HOY)
  .sort((a, b) => b.fecha.localeCompare(a.fecha));

/**
 * Instantánea del mes en curso.
 *
 * Los dos recuentos de clientes **se cuentan sobre `CLIENTES`**, no se escriben
 * a mano: así la cifra del dashboard y la lista de `/admin/usuarios` no pueden
 * discrepar. Un cliente «por vencer» sigue siendo un cliente activo — todavía
 * tiene membresía vigente.
 */
export const RESUMEN = {
  clientesActivos: CLIENTES.filter(
    (c) => c.estado === "Activa" || c.estado === "Por vencer",
  ).length,
  clientesActivosMesAnterior: 88,
  clientesInactivos30d: CLIENTES.filter((c) => c.estado === "Inactiva").length,
  /** Renovaciones logradas sobre membresías vencidas, en % */
  tasaRenovacion: 78.5,
  tasaRenovacionMesAnterior: 74.2,
};

/**
 * Quién ha entrado al panel. **No hay sesión**: es un dato fijo como el resto
 * de este archivo. Cuando haya auth, `getUsuarioActual()` leerá la sesión real
 * y esta constante desaparece con el resto de `mock.ts`.
 */
export const USUARIO_ACTUAL: UsuarioActual = {
  nombre: "Administrador",
  correo: "admin@reforme.com",
  rol: "Administrador",
};

/**
 * Avisos de ejemplo de la campana.
 *
 * ⚠️ **No hay ningún sistema de notificaciones detrás**: son maqueta para
 * decidir cómo se ven. Cuando lo haya, esto lo sustituye una consulta y
 * `getNotificaciones()` no cambia de forma.
 *
 * El primero de la lista **no está aquí**: lo compone `getNotificaciones()` a
 * partir de las membresías por vencer de verdad, para que no pueda decir «5
 * vencen» mientras el dashboard dice otra cosa.
 */
export const NOTIFICACIONES: Notificacion[] = [
  {
    id: "n2",
    tipo: "ok",
    titulo: "Laura Gutiérrez renovó su plan",
    detalle: "Trimestral · $510.000 · pago por Nequi",
    cuando: "hace 3 h",
    leida: false,
    href: "/admin/usuarios",
  },
  {
    id: "n3",
    tipo: "info",
    titulo: "2 clientes nuevos esta semana",
    detalle: "Diego Villamil y Esteban Escobar",
    cuando: "ayer",
    leida: true,
    href: "/admin/usuarios",
  },
];
