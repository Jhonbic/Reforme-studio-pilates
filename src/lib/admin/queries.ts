import { telefonoCO } from "./format";
import { finDe, sumarDias } from "./horario";
import { NOTIFICACIONES } from "./mock";
import { cache } from "react";
import {
  DIAS_POR_VENCER,
  avisoPorVencer,
  type DatosDashboard,
} from "./dashboard";
import type { DatosEstadisticas } from "./estadisticas";
import { crearClienteServidor } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/tipos";

type FilaClienteVigente =
  Database["public"]["Views"]["clientes_vigentes"]["Row"];
import type {
  Clase,
  ClaseDelCliente,
  ClaseParaReservar,
  MembresiaConSaldo,
  ClaseEnAgenda,
  FranjaHorario,
  Sala,
  SalaId,
  Cliente,
  EstadoClase,
  EstadoMembresia,
  MiembroEquipo,
  ModalidadPlan,
  Notificacion,
  Movimiento,
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
      .select("id, fecha, metodo, importe, concepto, categoria, comprobante_path"),
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
        comprobante: g.comprobante_path !== null,
      }),
    ),
  ];

  // Comparar cadenas ISO basta: se ordenan igual que cronológicamente.
  return movimientos.sort((a, b) => b.fecha.localeCompare(a.fecha));
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
    estado: f.estado ?? "Sin plan",
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

/**
 * El equipo del estudio (tabla `equipo`), con si cada persona puede entrar al
 * panel, ordenado alfabéticamente.
 *
 * Tener acceso = su cuenta (`cuenta_id`) tiene fila en `perfiles`. Solo
 * Administración ve los perfiles ajenos (RLS), así que para los demás roles
 * `acceso` va `null`: «no lo sé», no «no tiene».
 */
export async function getEquipo(esAdmin: boolean): Promise<MiembroEquipo[]> {
  const supabase = await crearClienteServidor();
  const [equipo, perfiles] = await Promise.all([
    supabase.from("equipo").select("*"),
    esAdmin ? supabase.from("perfiles").select("id") : Promise.resolve(null),
  ]);
  if (equipo.error) throw new Error(`No se pudo leer el equipo: ${equipo.error.message}`);
  if (perfiles?.error) throw new Error(`No se pudieron leer los accesos: ${perfiles.error.message}`);

  const conPerfil = new Set((perfiles?.data ?? []).map((p) => p.id));
  return equipo.data
    .map((m) => ({
      id: m.id,
      nombre: m.nombre,
      correo: m.correo,
      // En la base va en crudo; el formato es cosa de la pantalla.
      telefono: m.telefono ? telefonoCO(m.telefono) : "",
      rol: m.rol,
      clasesSemana: m.clases_semana,
      activo: m.activo,
      alta: m.alta,
      acceso: esAdmin ? m.cuenta_id !== null && conPerfil.has(m.cuenta_id) : null,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/**
 * Quién puede dar clase: instructoras **en activo**.
 *
 * ⚠️ El filtro por `activo` no es cosmético: es lo que impide programar una
 * clase con alguien que ya no trabaja en el estudio. Las clases pasadas de una
 * instructora dada de baja se siguen viendo —pasaron de verdad—, pero su nombre
 * desaparece del desplegable del formulario.
 */
/** Cuántas semanas por delante mantiene la agenda (tabla `ajustes`). */
export async function getSemanasAgenda(): Promise<number> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("ajustes").select("semanas_por_delante").single();
  if (error) throw new Error(`No se pudieron leer los ajustes: ${error.message}`);
  return data.semanas_por_delante;
}

/**
 * Rellena la agenda con el horario hasta las semanas que toca (solo los días
 * nuevos; la base lo decide). La llama la agenda antes de leer. Hay además un
 * cron diario: esto es la red por si el cron fallara.
 *
 * ⚠️ No rompe la página si falla: la agenda se pinta igual con lo que haya.
 */
export async function extenderAgenda(): Promise<void> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("extender_agenda");
  if (error) console.error(`No se pudo rellenar la agenda: ${error.message}`);
}

/** El horario semanal: todas las franjas, por día, hora y sala (Reformer primero). */
export async function getHorarioSemanal(hoy: string): Promise<FranjaHorario[]> {
  const supabase = await crearClienteServidor();
  /* Lo que cada franja ya tiene en la agenda: es la respuesta a «¿y esto qué
     hace?» que la pantalla da junto a cada hora encendida. */
  const { data: enAgenda, error: errorAgenda } = await supabase
    .from("clases")
    .select("franja_id, fecha")
    .not("franja_id", "is", null)
    .eq("cancelada", false)
    .gte("fecha", hoy);
  if (errorAgenda) throw new Error(`No se pudo leer la agenda del horario: ${errorAgenda.message}`);
  const porFranja = new Map<string, { n: number; hasta: string }>();
  for (const c of enAgenda) {
    const a = porFranja.get(c.franja_id!) ?? { n: 0, hasta: c.fecha };
    porFranja.set(c.franja_id!, { n: a.n + 1, hasta: c.fecha > a.hasta ? c.fecha : a.hasta });
  }

  const { data, error } = await supabase
    .from("horario_semanal")
    .select("id, dia, hora_inicio, duracion_min, sala, activa, instructora_id")
    .order("dia")
    .order("hora_inicio")
    .order("sala", { ascending: false });
  if (error) throw new Error(`No se pudo leer el horario: ${error.message}`);
  return data.map((f) => ({
    id: f.id,
    dia: f.dia,
    horaInicio: f.hora_inicio.slice(0, 5),
    duracionMin: f.duracion_min,
    sala: f.sala as SalaId,
    activa: f.activa,
    instructoraId: f.instructora_id,
    enAgenda: porFranja.get(f.id)?.n ?? 0,
    hastaAgenda: porFranja.get(f.id)?.hasta ?? null,
  }));
}

/** Las salas y su aforo (tabla `salas`): el formulario de clase no deja pasar de ahí. */
export async function getSalas(): Promise<Sala[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("salas").select("id, nombre, capacidad").order("id", { ascending: false });
  if (error) throw new Error(`No se pudieron leer las salas: ${error.message}`);
  return data.map((s) => ({ id: s.id as SalaId, nombre: s.nombre, capacidad: s.capacidad }));
}

export async function getInstructoras(): Promise<MiembroEquipo[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("equipo")
    .select("*")
    .eq("rol", "Instructora")
    .eq("activo", true)
    .order("nombre");
  if (error) throw new Error(`No se pudieron leer las instructoras: ${error.message}`);
  return data.map((m) => ({
    id: m.id,
    nombre: m.nombre,
    correo: m.correo,
    telefono: m.telefono ? telefonoCO(m.telefono) : "",
    rol: m.rol,
    clasesSemana: m.clases_semana,
    activo: m.activo,
    alta: m.alta,
  }));
}

/**
 * En qué punto está una clase.
 *
 * ⚠️ **El orden de las comprobaciones ES la definición del estado**, igual que
 * el `CASE` de `estado_de_membresia()` en la base de datos:
 * - `Cancelada` va primero y gana incluso a una fecha pasada: para quien la
 *   tenía reservada, lo que cuenta es que se anuló.
 * - `Finalizada` gana a `Llena`: una clase de ayer no admite reservas porque
 *   terminó, no porque esté completa.
 *
 * Desde que la agenda lee la base (oct 2026), «Finalizada» se decide por la
 * HORA de Bogotá y no solo por la fecha: la clase de las 07:00 ya ha terminado
 * a las 10:00 del mismo día. Antes no se podía: `getHoy()` era una fecha
 * congelada y el panel se prerenderizaba. Se calcula en el servidor y baja ya
 * resuelto, así que servidor y navegador no pueden discrepar.
 */
function estadoDeClase(
  c: Clase,
  horaFin: string,
  hoy: string,
  ahora: string,
): EstadoClase {
  if (c.cancelada) return "Cancelada";
  if (c.fecha < hoy || (c.fecha === hoy && horaFin <= ahora)) return "Finalizada";
  if (c.reservas >= c.cupos) return "Llena";
  return "Programada";
}

/** Misma frontera que `marcar_asistencia` en la base: desde la hora de inicio. */
function yaEmpezo(fecha: string, horaInicio: string, hoy: string, ahora: string) {
  return fecha < hoy || (fecha === hoy && horaInicio <= ahora);
}

/**
 * Ventana de la agenda que viaja al navegador: 5 semanas atrás y 13 por
 * delante. Cambiar de día dentro de ella es instantáneo; fuera de ella la tira
 * enseña días vacíos. Con un horario que se repite, cientos de clases; cuando
 * sean miles, la página pedirá la semana que se mira.
 */
const AGENDA_DIAS_ATRAS = 35;
const AGENDA_DIAS_ADELANTE = 91;

/**
 * La agenda, ya resuelta: cada clase con el nombre de su instructora, su hora
 * de fin, su estado, los cupos libres y quién la reservó.
 *
 * ⚠️ **Todo eso se calcula aquí y no en la pantalla.** Si el estado se dedujera
 * en cada componente, la misma clase podría salir «Llena» en la fila y
 * «Programada» en el resumen del día.
 *
 * `reservas` ya no es un número escrito: es cuántas filas tiene en la tabla
 * `reservas`.
 */
export async function getClases(hoy: string, ahora: string): Promise<ClaseEnAgenda[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("clases")
    .select(
      "id, tipo, sala, fecha, hora_inicio, duracion_min, instructora_id, cupos, cancelada, equipo(nombre), reservas(id, cliente_id, asistencia, clientes(nombre))",
    )
    .gte("fecha", sumarDias(hoy, -AGENDA_DIAS_ATRAS))
    .lte("fecha", sumarDias(hoy, AGENDA_DIAS_ADELANTE))
    .order("fecha")
    .order("hora_inicio");
  if (error) throw new Error(`No se pudo leer la agenda: ${error.message}`);

  return data.map((f) => {
    const reservados = f.reservas
      .map((r) => ({
        id: r.id,
        clienteId: r.cliente_id,
        nombre: r.clientes?.nombre ?? "Cliente eliminado",
        asistencia: r.asistencia,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    const clase: Clase = {
      id: f.id,
      tipo: f.tipo,
      sala: f.sala as SalaId,
      fecha: f.fecha,
      // Postgres devuelve `time` como «07:00:00»; la agenda trabaja en «07:00»
      // (se ordena igual alfabética que cronológicamente).
      horaInicio: f.hora_inicio.slice(0, 5),
      duracionMin: f.duracion_min,
      instructoraId: f.instructora_id,
      cupos: f.cupos,
      reservas: reservados.length,
      cancelada: f.cancelada,
    };
    const horaFin = finDe(clase.horaInicio, clase.duracionMin);
    return {
      ...clase,
      /* Una instructora borrada del equipo no puede pasar (`restrict`), pero si
         faltara el dato se nota en vez de disimularlo. */
      instructora: f.equipo?.nombre ?? "Sin asignar",
      horaFin,
      estado: estadoDeClase(clase, horaFin, hoy, ahora),
      /* Nunca negativo: la base no deja que haya más reservas que cupos, pero
         «−2 libres» sería ruido si algún día pasara. */
      libres: Math.max(0, clase.cupos - clase.reservas),
      empezada: yaEmpezo(clase.fecha, clase.horaInicio, hoy, ahora),
      reservados,
    };
  });
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
    modalidad: p.modalidad,
    clasesReformer: p.clases_reformer,
    clasesMat: p.clases_mat,
    clasesIncluidas: p.clases_reformer + p.clases_mat,
    seVende: p.se_vende,
    descripcion: p.descripcion,
    caracteristicas: p.caracteristicas,
    clientes: clientes.get(p.nombre) ?? 0,
    cobrado30d: puedeVerCobros ? (cobrado.get(p.id) ?? 0) : null,
  }));
}

/** Si el cliente puede entrar a la web (`/mi-cuenta`): tiene cuenta enlazada. */
export async function tieneAccesoWeb(clienteId: string): Promise<boolean> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("clientes")
    .select("cuenta_id")
    .eq("id", clienteId)
    .maybeSingle();
  return Boolean(data?.cuenta_id);
}

/** Un plan que se puede contratar hoy, con lo justo para elegirlo y calcular
 *  hasta cuándo dura. */
export type PlanALaVenta = {
  id: string;
  nombre: string;
  precio: number;
  vigenciaDias: number;
  modalidad: ModalidadPlan;
  clasesReformer: number;
  clasesMat: number;
};

/**
 * Los planes que se venden, del más barato al más caro: las opciones del
 * diálogo «Asignar plan». Los retirados (`se_vende = false`) no salen, y la
 * función de la base tampoco los aceptaría.
 */
export async function getPlanesALaVenta(): Promise<PlanALaVenta[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("planes")
    .select("id, nombre, precio, vigencia_dias, modalidad, clases_reformer, clases_mat")
    .eq("se_vende", true)
    .order("precio");
  if (error) throw new Error(`No se pudieron leer los planes: ${error.message}`);
  return data.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    precio: p.precio,
    vigenciaDias: p.vigencia_dias,
    modalidad: p.modalidad,
    clasesReformer: p.clases_reformer,
    clasesMat: p.clases_mat,
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
    "Sin plan": 0,
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
 * Lo que la pestaña Clientes del Dashboard necesita de la base, en una ida.
 * Lo calcula `lib/admin/dashboard.ts` (funciones puras).
 *
 * Sin pagos ni gastos: desde oct 2026 el dinero vive en Finanzas. Todo lo que
 * se pide aquí lo puede leer cualquier persona del equipo (RLS:
 * `tiene_perfil()`), así que el dashboard es el mismo para los tres roles.
 *
 * La fecha de nacimiento no está en la vista `clientes_vigentes`, así que se
 * pide a `clientes` y se une por id.
 */
export async function getDatosDashboard(): Promise<DatosDashboard> {
  const supabase = await crearClienteServidor();
  const [vigentes, nacimientos, membresias] = await Promise.all([
    supabase
      .from("clientes_vigentes")
      .select("id, nombre, telefono, plan, estado, vencimiento"),
    supabase.from("clientes").select("id, fecha_nacimiento"),
    supabase.from("membresias").select("cliente_id, inicio, vencimiento"),
  ]);
  for (const r of [vigentes, nacimientos, membresias]) {
    if (r.error) throw new Error(`No se pudo leer el dashboard: ${r.error.message}`);
  }

  const nacio = new Map(
    (nacimientos.data ?? []).map((c) => [c.id, c.fecha_nacimiento]),
  );
  return {
    clientes: (vigentes.data ?? []).map((v) => ({
      id: v.id ?? "",
      nombre: v.nombre ?? "",
      telefono: v.telefono,
      plan: v.plan,
      estado: v.estado,
      vencimiento: v.vencimiento,
      nacimiento: nacio.get(v.id ?? "") ?? null,
    })),
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

/**
 * Lo que necesita `/admin/estadisticas`, en una ida. Los cálculos los hace
 * `lib/admin/estadisticas.ts` (funciones puras).
 *
 * ⚠️ Solo para Administración: incluye los pagos (para «cuánto deja cada
 * cliente»), y RLS no se los da a las instructoras. La página lo comprueba
 * antes de llamar.
 */
export async function getDatosEstadisticas(): Promise<DatosEstadisticas> {
  const supabase = await crearClienteServidor();
  const [clientes, membresias, pagos, planes] = await Promise.all([
    supabase.from("clientes").select("id, nombre, fecha_nacimiento"),
    supabase.from("membresias").select("cliente_id, plan_id, inicio, vencimiento"),
    supabase.from("pagos").select("cliente_id, importe"),
    supabase.from("planes").select("id, nombre, clases_reformer, clases_mat, vigencia_dias"),
  ]);
  for (const r of [clientes, membresias, pagos, planes]) {
    if (r.error) throw new Error(`No se pudieron leer las estadísticas: ${r.error.message}`);
  }
  return {
    clientes: (clientes.data ?? []).map((c) => ({
      id: c.id,
      nombre: c.nombre,
      nacimiento: c.fecha_nacimiento,
    })),
    membresias: (membresias.data ?? []).map((m) => ({
      clienteId: m.cliente_id,
      planId: m.plan_id,
      inicio: m.inicio,
      vencimiento: m.vencimiento,
    })),
    pagos: (pagos.data ?? []).map((p) => ({ clienteId: p.cliente_id, importe: p.importe })),
    planes: (planes.data ?? []).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      clasesIncluidas: p.clases_reformer + p.clases_mat,
      vigenciaDias: p.vigencia_dias,
    })),
  };
}

export type SaldoClases = { tipo: "Reformer" | "Mat"; usadas: number; total: number };

/**
 * Las clases que le quedan HOY a un cliente, de cada tipo que trae su plan
 * (función `saldo_clases`, la misma que usa el área de cliente). Suma las
 * membresías que cubren hoy: si renovó antes de tiempo, puede haber dos.
 */
export async function getSaldoCliente(clienteId: string, hoy: string): Promise<SaldoClases[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("saldo_clases", { p_cliente: clienteId });
  if (error) throw new Error(`No se pudo leer el saldo de clases: ${error.message}`);
  const deHoy = data.filter((m) => m.inicio <= hoy && hoy <= m.vencimiento);
  const suma = (f: (m: (typeof deHoy)[number]) => number) => deHoy.reduce((t, m) => t + f(m), 0);
  return (
    [
      { tipo: "Reformer", total: suma((m) => m.clases_reformer), usadas: suma((m) => m.usadas_reformer) },
      { tipo: "Mat", total: suma((m) => m.clases_mat), usadas: suma((m) => m.usadas_mat) },
    ] as const
  )
    .filter((s) => s.total > 0)
    .map((s) => ({ ...s }));
}

/**
 * El id en `equipo` de quien tiene la sesión (o `null`). La agenda lo usa para
 * dejar a una instructora marcar la asistencia de SUS clases, y solo de esas;
 * la base lo vuelve a comprobar en `marcar_asistencia`.
 */
export async function getMiEquipoId(): Promise<string | null> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("mi_equipo_id");
  if (error) throw new Error(`No se pudo leer tu ficha del equipo: ${error.message}`);
  return data ?? null;
}

/**
 * Las clases de los próximos 14 días que todavía no han empezado ni se han
 * cancelado, para «Reservar clase» en la ficha de un cliente.
 */
export async function getClasesParaReservar(
  clienteId: string,
  hoy: string,
  ahora: string,
): Promise<ClaseParaReservar[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("clases")
    .select("id, tipo, sala, fecha, hora_inicio, duracion_min, cupos, equipo(nombre), reservas(cliente_id)")
    .eq("cancelada", false)
    .gte("fecha", hoy)
    .lte("fecha", sumarDias(hoy, 13))
    .order("fecha")
    .order("hora_inicio");
  if (error) throw new Error(`No se pudieron leer las próximas clases: ${error.message}`);
  return data
    .map((c) => {
      const horaInicio = c.hora_inicio.slice(0, 5);
      return {
        id: c.id,
        tipo: c.tipo,
        sala: c.sala as SalaId,
        fecha: c.fecha,
        horaInicio,
        horaFin: finDe(horaInicio, c.duracion_min),
        instructora: c.equipo?.nombre ?? "Sin asignar",
        libres: Math.max(0, c.cupos - c.reservas.length),
        yaReservada: c.reservas.some((r) => r.cliente_id === clienteId),
      };
    })
    .filter((c) => !yaEmpezo(c.fecha, c.horaInicio, hoy, ahora));
}

/** Las membresías de un cliente con lo que le queda de cada modalidad. */
export async function getMembresiasConSaldo(clienteId: string): Promise<MembresiaConSaldo[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("saldo_clases", { p_cliente: clienteId });
  if (error) throw new Error(`No se pudo leer el saldo de clases: ${error.message}`);
  return data.map((m) => ({
    inicio: m.inicio,
    vencimiento: m.vencimiento,
    reformer: m.clases_reformer - m.usadas_reformer,
    mat: m.clases_mat - m.usadas_mat,
  }));
}

/** Cuántas clases del historial viajan a la ficha: las más recientes. */
const HISTORIAL_CLASES = 30;

/**
 * Las clases que ha reservado un cliente, de la más reciente a la más antigua,
 * con su asistencia. Incluye las próximas: en recepción también se pregunta
 * «¿cuándo viene?».
 */
export async function getHistorialClases(
  clienteId: string,
  hoy: string,
  ahora: string,
): Promise<ClaseDelCliente[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("reservas")
    .select("id, asistencia, clases!inner(fecha, hora_inicio, tipo, cancelada, equipo(nombre))")
    .eq("cliente_id", clienteId)
    // Ordena las RESERVAS por la fecha de su clase (relación a uno). Con
    // `referencedTable` solo se ordenaría dentro del embebido.
    .order("clases(fecha)", { ascending: false })
    .order("clases(hora_inicio)", { ascending: false })
    .limit(HISTORIAL_CLASES);
  if (error) throw new Error(`No se pudo leer el historial de clases: ${error.message}`);

  return data.map((r) => {
      const horaInicio = r.clases.hora_inicio.slice(0, 5);
      return {
        reservaId: r.id,
        fecha: r.clases.fecha,
        horaInicio,
        tipo: r.clases.tipo,
        instructora: r.clases.equipo?.nombre ?? "Sin asignar",
        cancelada: r.clases.cancelada,
        empezada: yaEmpezo(r.clases.fecha, horaInicio, hoy, ahora),
        asistencia: r.asistencia,
      };
  });
}
