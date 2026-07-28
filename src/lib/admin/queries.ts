import { calcularVariacion, moneda } from "./format";
import { DIAS_CORTOS, diaSemana, finDe, sumarDias } from "./horario";
import {
  CLASES,
  CLIENTES,
  CONDICIONES_PLANES,
  EQUIPO,
  GASTOS,
  HOY,
  MEMBRESIAS_POR_VENCER,
  MESES,
  MOVIMIENTO_CLIENTES,
  NOTIFICACIONES,
  PAGOS,
  PRECIO_PLAN,
  REPARTO_METODOS,
  REPARTO_PLANES,
  RESUMEN,
  USUARIO_ACTUAL,
} from "./mock";
import type {
  Clase,
  ClaseEnAgenda,
  Cliente,
  EstadoClase,
  EstadoMembresia,
  Indicador,
  MiembroEquipo,
  Notificacion,
  Pago,
  PlanConMetricas,
  TipoPlan,
  UsuarioActual,
} from "./types";

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

/** Cuántos clientes tiene cada modalidad ahora mismo, contados sobre `CLIENTES`. */
function contarClientesPorPlan(): Map<TipoPlan, number> {
  const porPlan = new Map<TipoPlan, number>();
  for (const c of CLIENTES) {
    porPlan.set(c.plan, (porPlan.get(c.plan) ?? 0) + 1);
  }
  return porPlan;
}

/**
 * Reparto de ingresos por modalidad.
 *
 * ⚠️ **El recuento de clientes se DERIVA de `CLIENTES`; solo el importe sale de
 * `REPARTO_PLANES`.** Los números escritos a mano en el mock sumaban 121
 * clientes mientras la base tiene 118: era un dato que se quedó atrás cuando
 * `CLIENTES` pasó a ser la fuente de verdad. Con esto, la tabla del donut del
 * dashboard y la pantalla de Planes cuentan lo mismo por construcción, que es
 * la misma regla que ya seguían `MEMBRESIAS_POR_VENCER` y `RESUMEN`.
 *
 * El importe no se puede derivar: es cuánto factura el plan al mes, no algo
 * deducible de la ficha de cada cliente.
 */
export function getRepartoPlanes() {
  const porPlan = contarClientesPorPlan();
  return REPARTO_PLANES.map((r) => ({
    ...r,
    clientes: porPlan.get(r.plan) ?? 0,
  }));
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

/**
 * El libro completo, del pago más reciente al más antiguo.
 *
 * Sin filtros de servidor a propósito: son ~100 registros que ya viajan al
 * navegador, así que filtrarlos allí es instantáneo y evita que la ruta deje de
 * prerenderizarse. Con base de datos y miles de pagos, esto pasará a recibir
 * periodo y método y a paginar en servidor.
 */
export function getPagos(): Pago[] {
  return PAGOS;
}

/**
 * La fecha que el panel considera «hoy».
 *
 * ⚠️ Existe para que las pantallas **no importen `HOY` de `mock.ts`**: la regla
 * del proyecto es que la UI llame siempre a esta capa, y Finanzas se la estaba
 * saltando. Hoy devuelve la constante congelada del mock —necesaria para que el
 * prerenderizado sea reproducible—; con base de datos pasará a ser la fecha
 * real del servidor y ninguna pantalla se enterará del cambio.
 */
export function getHoy(): string {
  return HOY;
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
 * Quién puede dar clase: instructoras **en activo**.
 *
 * ⚠️ El filtro por `activo` no es cosmético: es lo que impide programar una
 * clase con alguien que ya no trabaja en el estudio. Las clases pasadas de una
 * instructora dada de baja se siguen viendo —pasaron de verdad—, pero su nombre
 * desaparece del desplegable del formulario.
 */
export function getInstructoras(): MiembroEquipo[] {
  return getEquipo().filter((m) => m.rol === "Instructora" && m.activo);
}

/**
 * En qué punto está una clase.
 *
 * ⚠️ **El orden de las comprobaciones ES la definición del estado**, igual que
 * el `CASE` de `estado_de_membresia()` en la base de datos. Cambiarlo cambia lo
 * que dice la agenda:
 * - `Cancelada` va primero y gana incluso a una fecha pasada: para quien la
 *   tenía reservada, lo que cuenta es que se anuló.
 * - `Finalizada` gana a `Llena`: una clase de ayer no admite reservas porque
 *   terminó, no porque esté completa.
 *
 * ⚠️ **«Finalizada» se decide por FECHA, no por hora**, y es a propósito: no hay
 * reloj del que fiarse. `getHoy()` devuelve una constante congelada y el panel se
 * prerenderiza en el build, así que comparar contra la hora real haría que el
 * servidor y el navegador pintaran estados distintos — el mismo fallo de
 * hidratación que ya evitan `format.ts` y el alta de cliente. Con backend, el
 * reloj del servidor afinará esto hasta la hora y ninguna pantalla se enterará.
 */
function estadoDeClase(c: Clase, hoy: string): EstadoClase {
  if (c.cancelada) return "Cancelada";
  if (c.fecha < hoy) return "Finalizada";
  if (c.reservas >= c.cupos) return "Llena";
  return "Programada";
}

/**
 * La agenda completa, ya resuelta: cada clase con el nombre de su instructora,
 * su hora de fin, su estado y los cupos libres.
 *
 * ⚠️ **Todo eso se calcula aquí y no en la pantalla.** Si el estado se dedujera
 * en cada componente, la misma clase podría salir «Llena» en la fila y
 * «Programada» en el resumen del día. Es la misma regla por la que
 * `getRepartoPlanes()` cuenta los clientes en un solo sitio.
 *
 * Sin filtros de servidor, como el libro de pagos: son unas 250 clases que ya
 * viajan al navegador, así que cambiar de día allí es instantáneo y la ruta
 * sigue prerenderizándose. Con base de datos, esto recibirá un rango de fechas.
 */
export function getClases(): ClaseEnAgenda[] {
  const hoy = getHoy();
  const nombres = new Map(EQUIPO.map((m) => [m.id, m.nombre]));

  return CLASES.map((c) => ({
    ...c,
    /* Una instructora borrada del equipo no debe dejar la fila en blanco: se
       nota que falta el dato en vez de disimularlo. */
    instructora: nombres.get(c.instructoraId) ?? "Sin asignar",
    horaFin: finDe(c.horaInicio, c.duracionMin),
    estado: estadoDeClase(c, hoy),
    /* Nunca negativo: si alguna vez se recortara el aforo por debajo de las
       reservas ya hechas, «−2 libres» sería ruido. El formulario, además, no
       deja llegar ahí. */
    libres: Math.max(0, c.cupos - c.reservas),
  }));
}

/**
 * Cuántas semanas hacia atrás mira el reparto por día de la semana.
 *
 * Dos, porque **son las que hay**: la agenda de ejemplo se genera con dos
 * semanas de pasado. Con base de datos esto se sube a 8 o 12 (un patrón semanal
 * necesita repeticiones para no ser el ruido de una semana rara), y es el único
 * número que hay que tocar.
 */
export const SEMANAS_RESERVAS = 2;

export type ReservasPorDia = {
  /** `"Lun"`, `"Mar"`… empezando en lunes. */
  dia: string;
  reservas: number;
  cupos: number;
  clases: number;
};

/**
 * Reservas acumuladas por día de la semana, de lunes a domingo.
 *
 * Responde a «¿qué días llena el estudio?», que es lo que decide dónde añadir
 * clases y dónde quitarlas. Por eso se agrupa por **día de la semana** y no por
 * fecha: un lunes suelto no dice nada, catorce lunes sí.
 *
 * ⚠️ **Son RESERVAS, no asistencias verificadas.** No existe todavía el
 * registro de quién apareció: `Clase.reservas` es cuánta gente apartó cupo.
 * Cuando ese registro exista, esta misma función devuelve un campo más y la
 * tarjeta pasa a dos series (reservado / asistió) — que es justo lo que hace
 * visible el problema del «reserva y no viene», hoy invisible.
 *
 * ⚠️ **Solo cuenta clases que ya pasaron** (`fecha < hoy`, misma frontera que
 * `Finalizada`) **y no canceladas**. Con las futuras dentro, el reparto mezclaría
 * lo que ocurrió con lo que aún puede cambiar, y los días que caen más adelante
 * en la ventana saldrían artificialmente flojos solo por estar más lejos.
 *
 * ⚠️ **Los siete días salen siempre, aunque el domingo sea cero.** Un hueco en
 * la semana es información —el estudio cierra— y quitarlo haría que la gráfica
 * dijera que la semana tiene seis días.
 */
export function getReservasPorDiaSemana(): ReservasPorDia[] {
  const hoy = getHoy();
  const desde = sumarDias(hoy, -7 * SEMANAS_RESERVAS);

  const acumulado: ReservasPorDia[] = DIAS_CORTOS.map((dia) => ({
    dia,
    reservas: 0,
    cupos: 0,
    clases: 0,
  }));

  for (const c of CLASES) {
    if (c.cancelada) continue;
    if (c.fecha >= hoy || c.fecha < desde) continue;

    const d = acumulado[diaSemana(c.fecha)];
    d.reservas += c.reservas;
    d.cupos += c.cupos;
    d.clases += 1;
  }

  return acumulado;
}

/** Un cliente por su id, o `undefined` si no existe (→ 404 en la ficha). */
export function getCliente(id: string): Cliente | undefined {
  return CLIENTES.find((c) => c.id === id);
}

/**
 * Los ids de todos los clientes, para `generateStaticParams`.
 *
 * ⚠️ Existe para que la ficha se prerenderice y la ruta siga saliendo
 * `○ Static` como las demás. El día que haya base de datos con miles de
 * clientes, prerenderizarlos todos deja de tener sentido: ahí esta función se
 * cambia por las fichas más visitadas (o por ninguna, aceptando que la ruta
 * pase a dinámica).
 */
export function getClienteIds(): string[] {
  return CLIENTES.map((c) => c.id);
}

/**
 * Cuántos clientes hay en cada estado, más el total.
 *
 * Va aquí y no en la pantalla porque es un dato del dominio: los recuentos que
 * se enseñan dentro de los filtros son los mismos que alimentan el dashboard.
 */
/**
 * El catálogo de planes con lo que ha pasado con cada uno.
 *
 * Los clientes se cuentan sobre `CLIENTES` con el mismo ayudante que usa
 * `getRepartoPlanes()`, así que esta pantalla y el donut del dashboard no
 * pueden discrepar.
 *
 * La facturación sí sale de `REPARTO_PLANES`: es un importe mensual del reparto
 * de ingresos, no algo que se pueda deducir de la ficha de cada cliente.
 */
export function getPlanes(): PlanConMetricas[] {
  const porPlan = contarClientesPorPlan();

  return CONDICIONES_PLANES.map((cond) => ({
    ...cond,
    nombreVisible: cond.plan,
    precio: PRECIO_PLAN[cond.plan],
    clientes: porPlan.get(cond.plan) ?? 0,
    facturacionMes:
      REPARTO_PLANES.find((r) => r.plan === cond.plan)?.importe ?? 0,
  }));
}

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

export function getIngresoEnRiesgo(dias = 7) {
  return getMembresiasPorVencer(dias).reduce(
    (t, m) => t + m.importeRenovacion,
    0,
  );
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

/**
 * Las cifras de cabecera de Finanzas: el mes cerrado frente al anterior.
 *
 * ⚠️ **No repiten las del Dashboard.** Allí se pregunta «¿cómo vamos de
 * plata?» y se responde con ingresos, utilidad y clientes. Aquí se entra a
 * mirar la contabilidad, así que lo que importa es el **margen** (qué
 * proporción de lo que entra se queda) y la **desviación del presupuesto** (si
 * se está gastando lo previsto). Ninguna de las dos estaba visible en ningún
 * sitio: el presupuesto solo se veía como marca dentro de una barra.
 */
export function getIndicadoresFinanzas(): Indicador[] {
  const actual = MESES[MESES.length - 1];
  const anterior = MESES[MESES.length - 2];

  const utilidad = actual.ingresos - actual.gastos;
  const utilidadAnterior = anterior.ingresos - anterior.gastos;

  /* Margen sobre ingresos. Con ingresos a 0 no hay margen que calcular, y eso
     no es «0 %»: es que la pregunta no aplica. */
  const margen = actual.ingresos ? (utilidad / actual.ingresos) * 100 : 0;
  const margenAnterior = anterior.ingresos
    ? (utilidadAnterior / anterior.ingresos) * 100
    : 0;

  const presupuestado = GASTOS.reduce((t, g) => t + g.presupuesto, 0);
  const gastado = GASTOS.reduce((t, g) => t + g.importe, 0);
  const pasadas = GASTOS.filter((g) => g.importe > g.presupuesto).length;

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
      etiqueta: "Gastos del mes",
      valor: actual.gastos,
      formato: "moneda",
      variacion: calcularVariacion(actual.gastos, anterior.gastos),
      // Gastar más que el mes pasado no es una buena noticia.
      subirEsBueno: false,
      detalle: `frente a ${moneda(anterior.gastos)} en ${anterior.mes}`,
    },
    {
      etiqueta: "Margen",
      valor: margen,
      formato: "porcentaje",
      /* ⚠️ En PUNTOS porcentuales, no en variación relativa: pasar de 30 % a
         33 % son 3 puntos. Decir «+10 %» ahí se confundiría con el margen. */
      variacion: margen - margenAnterior,
      subirEsBueno: true,
      detalle: "de cada peso que entra",
    },
    {
      /* ⚠️ Se enseña como PORCENTAJE de lo presupuestado, no como la
         desviación en pesos. En pesos, quedarse corto sale en negativo
         («−$200.000») y hay que pararse a pensar si eso es bueno; en
         porcentaje, 102 % se lee al instante como «nos pasamos un 2 %». */
      etiqueta: "Presupuesto usado",
      valor: presupuestado ? (gastado / presupuestado) * 100 : 0,
      formato: "porcentaje",
      variacion: null,
      subirEsBueno: false,
      detalle: `de ${moneda(presupuestado)} · ${
        pasadas === 0
          ? "ninguna categoría por encima"
          : pasadas === 1
            ? "1 categoría por encima"
            : `${pasadas} categorías por encima`
      }`,
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

/**
 * Quién está usando el panel.
 *
 * ⚠️ **No lee ninguna sesión: devuelve el dato fijo de `mock.ts`.** El día que
 * haya autenticación, esta función es el único sitio donde hay que ir a buscar
 * al usuario de verdad — la cabecera no se entera.
 */
export function getUsuarioActual(): UsuarioActual {
  return USUARIO_ACTUAL;
}

/**
 * Avisos de la campana, del más reciente al más viejo.
 *
 * ⚠️ **El primero se DERIVA de las membresías por vencer**, no está escrito en
 * `mock.ts`: si fuera un texto suelto podría decir «5 vencen» mientras la cifra
 * de cabecera del dashboard dice otra cosa. Es la misma regla por la que
 * `MEMBRESIAS_POR_VENCER` sale de `CLIENTES`.
 *
 * Los otros dos sí son de ejemplo: no hay ningún sistema de notificaciones
 * detrás todavía.
 */
export function getNotificaciones(): Notificacion[] {
  const porVencer = getMembresiasPorVencer(DIAS_POR_VENCER);

  return [
    {
      id: "n1",
      tipo: "aviso",
      titulo: `${porVencer.length} membresías vencen esta semana`,
      detalle: `${moneda(getIngresoEnRiesgo(DIAS_POR_VENCER))} en renovaciones por confirmar`,
      cuando: "hoy",
      leida: false,
      href: "/admin/usuarios",
    },
    ...NOTIFICACIONES,
  ];
}
