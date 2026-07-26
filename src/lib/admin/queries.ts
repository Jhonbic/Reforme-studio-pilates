import { calcularVariacion, moneda } from "./format";
import {
  CARTERA,
  CLIENTES,
  EQUIPO,
  GASTOS,
  MEMBRESIAS_POR_VENCER,
  MESES,
  MOVIMIENTO_CLIENTES,
  NOTIFICACIONES,
  REPARTO_METODOS,
  REPARTO_PLANES,
  RESUMEN,
  USUARIO_ACTUAL,
} from "./mock";
import type {
  Cliente,
  EstadoMembresia,
  Indicador,
  MiembroEquipo,
  Notificacion,
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

/** Cuántos avisos sin leer. Lo consume el punto de la campana. */
export function getNoLeidas(): number {
  return getNotificaciones().filter((n) => !n.leida).length;
}
