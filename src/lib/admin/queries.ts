import { telefonoCO } from "./format";
import { DIAS_CORTOS, diaSemana, finDe, sumarDias } from "./horario";
import {
  CLASES,
  EQUIPO,
  HOY,
  NOTIFICACIONES,
} from "./mock";
import { cache } from "react";
import {
  DIAS_POR_VENCER,
  avisoPorVencer,
  type DatosDashboard,
} from "./dashboard";
import { crearClienteServidor } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/tipos";

type FilaClienteVigente =
  Database["public"]["Views"]["clientes_vigentes"]["Row"];
import type {
  Clase,
  ClaseEnAgenda,
  Cliente,
  EstadoClase,
  EstadoMembresia,
  MiembroEquipo,
  Notificacion,
  Movimiento,
  PlanConMetricas,
  Presupuesto,
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

/**
 * El libro de Finanzas: todos los cobros y todos los gastos, del más reciente
 * al más antiguo.
 *
 * ⚠️ **Sin filtro de periodo en la consulta, a propósito.** El periodo lo
 * cambia la pantalla al vuelo y compara con el periodo anterior: con un
 * estudio de este tamaño son unos cientos de filas al año, y traerlas una vez
 * hace que cambiar de mes sea instantáneo. Cuando pasen de unos miles, esta
 * función recibirá `[desde, hasta]` y el cambio de periodo irá al servidor.
 *
 * ⚠️ Los gastos solo los devuelve RLS a Administración. Por eso la página de
 * Finanzas es solo para ese rol: a Recepción le llegarían los cobros sin los
 * gastos, y la utilidad saldría inflada sin que nada lo advirtiera.
 */
export async function getMovimientos(): Promise<Movimiento[]> {
  const supabase = await crearClienteServidor();
  const [pagos, gastos] = await Promise.all([
    supabase
      .from("pagos")
      .select(
        "id, fecha, metodo, importe, cliente_id, clientes(nombre), membresias(planes(nombre))",
      ),
    supabase
      .from("gastos")
      .select("id, fecha, metodo, importe, concepto, categoria"),
  ]);
  if (pagos.error) throw new Error(`No se pudieron leer los cobros: ${pagos.error.message}`);
  if (gastos.error) throw new Error(`No se pudieron leer los gastos: ${gastos.error.message}`);

  const movimientos: Movimiento[] = [
    ...pagos.data.map(
      (p): Movimiento => ({
        tipo: "cobro",
        id: p.id,
        fecha: p.fecha,
        metodo: p.metodo,
        importe: p.importe,
        clienteId: p.cliente_id,
        cliente: p.clientes?.nombre ?? "Cliente eliminado",
        plan: p.membresias?.planes?.nombre ?? null,
      }),
    ),
    ...gastos.data.map(
      (g): Movimiento => ({
        tipo: "gasto",
        id: g.id,
        fecha: g.fecha,
        metodo: g.metodo,
        importe: g.importe,
        concepto: g.concepto,
        categoria: g.categoria,
      }),
    ),
  ];

  // Comparar cadenas ISO basta: se ordenan igual que cronológicamente.
  return movimientos.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/** Presupuestos por categoría y mes. Solo Administración (RLS). */
export async function getPresupuestos(): Promise<Presupuesto[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("presupuestos")
    .select("categoria, mes, importe");
  if (error) throw new Error(`No se pudieron leer los presupuestos: ${error.message}`);
  return data;
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

/**
 * Una fila de la vista `clientes_vigentes` → el `Cliente` que pinta la UI.
 *
 * ⚠️ En una vista Postgres declara TODAS las columnas anulables, aunque en la
 * tabla no lo sean; de ahí los `??`. Los de verdad anulables son correo,
 * teléfono y última asistencia.
 *
 * ⚠️ Plan, vencimiento y estado vienen de la ÚLTIMA MEMBRESÍA. Hoy todos los
 * clientes tienen una, pero el alta de cliente no pregunta por el plan
 * (decisión del usuario), así que al conectar el alta (paso 6) aparecerán
 * clientes sin membresía, y `estado_de_membresia(null, …)` los da por
 * «Activa». Eso hay que resolverlo ahí, no aquí.
 */
function aCliente(f: FilaClienteVigente): Cliente {
  return {
    id: f.id ?? "",
    nombre: f.nombre ?? "",
    identificacion: f.identificacion ?? "",
    tipoIdentificacion: f.tipo_identificacion ?? undefined,
    correo: f.correo ?? "",
    // En la base va en crudo («3209078814»); el formato es cosa de la UI.
    telefono: f.telefono ? telefonoCO(f.telefono) : "",
    plan: (f.plan ?? "") as TipoPlan,
    estado: f.estado ?? "Inactiva",
    vencimiento: f.vencimiento ?? "",
    alta: f.alta ?? "",
    ultimaAsistencia: f.ultima_asistencia,
    importeRenovacion: f.importe_renovacion ?? 0,
  };
}

/**
 * La base de clientes, ordenada alfabéticamente. Es el orden por defecto de
 * `/admin/usuarios`; los demás criterios los aplica la propia pantalla.
 *
 * Lee de Supabase (vista `clientes_vigentes`), con la sesión de quien mira:
 * lo que devuelve lo decide RLS. Un error se LANZA en vez de devolver `[]`:
 * una lista vacía diría «no hay clientes», que es mentira.
 *
 * ⚠️ El orden lo hace JS con `localeCompare("es")` y no `order by`: la
 * colación de Postgres pondría «Álvaro» detrás de «Zoe».
 */
export async function getClientes(): Promise<Cliente[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("clientes_vigentes").select("*");
  if (error) throw new Error(`No se pudieron leer los clientes: ${error.message}`);

  return data
    .map(aCliente)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Un cliente por su id, o `undefined` si no existe (→ 404 en la ficha).
 *
 * ⚠️ El id se valida ANTES de preguntar: la columna es `uuid`, y con
 * `/admin/usuarios/loquesea` Postgres no respondería «no existe», sino un
 * error de sintaxis, que acabaría en un 500 en vez de en el 404 que es.
 *
 * `cache()` porque la ficha la pide dos veces —`generateMetadata` y la
 * página— y así es una sola consulta.
 */
export const getCliente = cache(
  async (id: string): Promise<Cliente | undefined> => {
    if (!UUID.test(id)) return undefined;

    const supabase = await crearClienteServidor();
    const { data, error } = await supabase
      .from("clientes_vigentes")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`No se pudo leer el cliente: ${error.message}`);

    return data ? aCliente(data) : undefined;
  },
);

/**
 * El catálogo de planes (tabla `planes`) con lo que ha pasado con cada uno,
 * del más barato al más caro.
 *
 * - **Clientes**: se cuentan sobre `clientes_vigentes`, la misma vista del
 *   listado de Usuarios, así que las dos pantallas no pueden discrepar.
 *   ⚠️ Esa vista da el plan por NOMBRE, no por id. Hoy da igual (`nombre` es
 *   `unique`), pero si un día se renombra un plan, se cuenta bien igualmente
 *   porque la vista lee el nombre actual del plan.
 * - **Cobrado en 30 días**: suma de `pagos` cuya membresía es de este plan.
 *   Ventana móvil y no «este mes»: el día 1 de cada mes saldría todo a cero.
 *
 * `puedeVerCobros` lo decide quien llama según el rol: RLS no le da los pagos
 * a las instructoras, y la consulta no fallaría, devolvería cero filas.
 */
export async function getPlanes(
  hoy: string,
  puedeVerCobros: boolean,
): Promise<PlanConMetricas[]> {
  const supabase = await crearClienteServidor();
  const desde = sumarDias(hoy, -29);

  const [planes, vigentes, pagos] = await Promise.all([
    supabase.from("planes").select("*").order("precio"),
    supabase.from("clientes_vigentes").select("plan, estado"),
    puedeVerCobros
      ? supabase
          .from("pagos")
          .select("importe, membresias(plan_id)")
          .gte("fecha", desde)
          .lte("fecha", hoy)
      : Promise.resolve(null),
  ]);
  if (planes.error) throw new Error(`No se pudieron leer los planes: ${planes.error.message}`);
  if (vigentes.error) throw new Error(`No se pudieron contar los clientes: ${vigentes.error.message}`);
  if (pagos?.error) throw new Error(`No se pudieron leer los cobros: ${pagos.error.message}`);

  const clientes = new Map<string, number>();
  for (const v of vigentes.data) {
    if (!v.plan || v.estado === "Vencida") continue;
    clientes.set(v.plan, (clientes.get(v.plan) ?? 0) + 1);
  }

  const cobrado = new Map<string, number>();
  for (const p of pagos?.data ?? []) {
    const planId = p.membresias?.plan_id;
    if (!planId) continue;
    cobrado.set(planId, (cobrado.get(planId) ?? 0) + p.importe);
  }

  return planes.data.map((p) => ({
    id: p.id,
    nombreVisible: p.nombre,
    precio: p.precio,
    vigenciaDias: p.vigencia_dias,
    clasesIncluidas: p.clases_incluidas,
    seVende: p.se_vende,
    descripcion: p.descripcion,
    caracteristicas: p.caracteristicas,
    clientes: clientes.get(p.nombre) ?? 0,
    cobrado30d: puedeVerCobros ? (cobrado.get(p.id) ?? 0) : null,
  }));
}

/**
 * Cuántos clientes hay en cada estado, más el total: los números de las
 * pastillas de filtro de `/admin/usuarios`.
 *
 * ⚠️ Mientras el dashboard siga en `mock.ts` (paso 5), sus cifras y estas NO
 * coinciden: aquí son los clientes de Supabase.
 */
export function getConteoEstados(
  clientes: Cliente[],
): Record<EstadoMembresia | "Todas", number> {
  const conteo: Record<EstadoMembresia | "Todas", number> = {
    Todas: clientes.length,
    Activa: 0,
    "Por vencer": 0,
    Vencida: 0,
    Inactiva: 0,
  };
  // Se cuenta sobre la lista que ya se pidió, no con otra consulta: así las
  // pastillas y las filas no pueden decir cosas distintas.
  for (const c of clientes) conteo[c.estado] += 1;
  return conteo;
}

/**
 * Quién está usando el panel: la sesión de Supabase más su fila de `perfiles`.
 *
 * Devuelve `null` en los dos casos en que no se debe entrar, y el layout echa a
 * `/login`:
 * - **sin sesión** (el proxy ya lo filtra, pero el layout no se fía de él);
 * - **con sesión pero sin perfil**: estar en `auth.users` no hace a nadie del
 *   estudio. Es la misma regla que aplica RLS con `tiene_perfil()`, y aquí se
 *   repite para no pintar un panel vacío a quien la base no le va a dar nada.
 *
 * ⚠️ `getUser()` y no `getSession()`: getUser pregunta al servidor de Auth,
 * así que una cookie falsificada o de una cuenta borrada no pasa.
 *
 * `cache()` hace que, si dos componentes la llaman en el mismo render, la
 * consulta se haga una sola vez.
 */
export const getUsuarioActual = cache(
  async (): Promise<UsuarioActual | null> => {
    const supabase = await crearClienteServidor();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: perfil } = await supabase
      .from("perfiles")
      .select("nombre, rol")
      .eq("id", user.id)
      .maybeSingle();
    if (!perfil) return null;

    return { nombre: perfil.nombre, correo: user.email ?? "", rol: perfil.rol };
  },
);

/**
 * Todo lo que el Dashboard necesita de la base, en una sola ida.
 *
 * Se trae una vez y lo calcula `lib/admin/dashboard.ts` (funciones puras):
 * varias tarjetas leen las mismas filas —los pagos alimentan la cifra del mes,
 * la serie, el donut y los métodos—, y pedirlas cuatro veces haría cuatro
 * consultas que podrían no coincidir si entra un pago entre medias.
 *
 * ⚠️ Lo que RLS no da a un rol llega VACÍO, no con error: los gastos para
 * Recepción, gastos y pagos para Instructora. La página no pinta las
 * tarjetas de dinero a quien no es Administración, para que no salgan cifras
 * falseadas.
 */
export async function getDatosDashboard(): Promise<DatosDashboard> {
  const supabase = await crearClienteServidor();
  const [pagos, gastos, presupuestos, vigentes, clientes, membresias] =
    await Promise.all([
      supabase.from("pagos").select("fecha, importe, metodo, membresias(planes(nombre))"),
      supabase.from("gastos").select("fecha, importe, categoria"),
      supabase.from("presupuestos").select("categoria, mes, importe"),
      supabase.from("clientes_vigentes").select("plan, estado, vencimiento, importe_renovacion"),
      supabase.from("clientes").select("alta"),
      supabase.from("membresias").select("cliente_id, inicio, vencimiento"),
    ]);
  for (const r of [pagos, gastos, presupuestos, vigentes, clientes, membresias]) {
    if (r.error) throw new Error(`No se pudo leer el dashboard: ${r.error.message}`);
  }

  return {
    pagos: (pagos.data ?? []).map((p) => ({
      fecha: p.fecha,
      importe: p.importe,
      metodo: p.metodo,
      plan: p.membresias?.planes?.nombre ?? null,
    })),
    gastos: gastos.data ?? [],
    presupuestos: presupuestos.data ?? [],
    vigentes: (vigentes.data ?? []).map((v) => ({
      plan: v.plan,
      estado: v.estado,
      vencimiento: v.vencimiento,
      importeRenovacion: v.importe_renovacion ?? 0,
    })),
    altas: (clientes.data ?? []).map((c) => c.alta),
    membresias: (membresias.data ?? []).map((m) => ({
      clienteId: m.cliente_id,
      inicio: m.inicio,
      vencimiento: m.vencimiento,
    })),
  };
}

/**
 * Avisos de la campana, del más reciente al más viejo.
 *
 * ⚠️ **El primero se DERIVA de las membresías por vencer de la base**, con la
 * misma función que la cifra «Cartera por vencer» del Dashboard: si fuera un
 * texto suelto podría decir «5 vencen» mientras la cabecera dice otra cosa.
 *
 * Los otros dos siguen siendo de ejemplo (`mock.ts`): no hay ningún sistema
 * de notificaciones detrás todavía, y el propio menú lo dice.
 */
export async function getNotificaciones(hoy: string): Promise<Notificacion[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("clientes_vigentes")
    .select("vencimiento, importe_renovacion");
  if (error) throw new Error(`No se pudieron leer los avisos: ${error.message}`);

  const { cuantos, importe } = avisoPorVencer(
    {
      vigentes: data.map((v) => ({
        plan: null,
        estado: null,
        vencimiento: v.vencimiento,
        importeRenovacion: v.importe_renovacion ?? 0,
      })),
    },
    hoy,
  );

  return [
    {
      id: "n1",
      tipo: "aviso",
      titulo:
        cuantos === 1
          ? `1 membresía vence en ${DIAS_POR_VENCER} días`
          : `${cuantos} membresías vencen en ${DIAS_POR_VENCER} días`,
      detalle: `${importe} en renovaciones por confirmar`,
      cuando: "hoy",
      leida: false,
      href: "/admin/usuarios",
    },
    ...NOTIFICACIONES,
  ];
}
