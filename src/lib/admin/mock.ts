import { CUPOS_SUGERIDOS } from "./catalogos";
import { diaSemana, diasEntre, sumarDias } from "./horario";
import type {
  Clase,
  MiembroEquipo,
  Notificacion,
  TipoClase,
} from "./types";

/**
 * DATOS DE EJEMPLO — no son reales.
 *
 * ⚠️ **Desde oct 2026 aquí solo queda lo que aún no está en Supabase**: el
 * equipo, la agenda de clases, los avisos de ejemplo de la campana y el `HOY`
 * congelado que usa la agenda. Clientes, pagos, gastos, planes y todas las
 * cifras del dashboard se borraron de este archivo al pasar a leerse de la
 * base (pasos 3 a 5 del plan): dejarlos habría hecho creer que el panel aún
 * los usaba.
 *
 * Sigue siendo el ÚNICO archivo que hay que sustituir: `queries.ts` expone las
 * mismas funciones.
 */

/**
 * Fecha de referencia del panel. **No se usa `Date.now()` a propósito:** las
 * páginas se renderizan en el servidor durante el build, así que un "hoy" real
 * haría que los días restantes cambiaran en cada despliegue y que el HTML del
 * servidor no coincidiera con el del cliente. Cuando haya base de datos, este
 * es el punto donde entra la fecha real.
 */
export const HOY = "2026-07-25";

/* `sumarDias` vivía aquí y se mudó a `horario.ts` (misma implementación, en
   UTC). ⚠️ No es una mudanza cosmética: `mock.ts` es **el único archivo que se
   tira** el día que haya base de datos, y un ayudante de fechas que usan la
   agenda y media docena de pantallas no puede irse con él. `HOY` sí se queda:
   eso es un dato, no una función. */

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

/**
 * Avisos de ejemplo de la campana.
 *
 * ⚠️ **No hay ningún sistema de notificaciones detrás**: son maqueta para
 * decidir cómo se ven. Cuando lo haya, esto lo sustituye una consulta y
 * `getNotificaciones()` no cambia de forma.
 *
 * El primero de la lista **no está aquí**: lo compone `getNotificaciones()` a
 * partir de las membresías por vencer de la base, para que no pueda decir «5
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

/* ── Agenda de clases ─────────────────────────────────────────────────────
   El horario NO está escrito clase a clase: se genera a partir de una plantilla
   semanal, que es como funciona un estudio de verdad —los mismos huecos todas
   las semanas— y como acabará funcionando la tabla real (una plantilla que se
   proyecta a fechas concretas).

   ⚠️ **Nada aquí usa `Math.random()`.** El panel se prerenderiza en el build:
   con datos aleatorios, cada compilación daría un horario distinto y el HTML del
   servidor no coincidiría con el del cliente. Lo que parece azar (las reservas,
   las dos clases anuladas) sale de un hash del id, que es estable para siempre. */

/** Una casilla de la plantilla semanal. */
type Ranura = { hora: string; tipo: TipoClase; duracionMin: number };

const MANANA: Ranura[] = [
  { hora: "06:00", tipo: "Reformer", duracionMin: 50 },
  { hora: "07:00", tipo: "Reformer", duracionMin: 50 },
  { hora: "09:00", tipo: "Mat", duracionMin: 55 },
];

/* Las dos de las 18:00 son SIMULTÁNEAS y van a propósito: son la prueba de que
   «varias clases el mismo día» incluye varias clases a la misma hora, en dos
   salas y con dos instructoras distintas. Van seguidas en el array porque el
   reparto de instructoras es por índice (ver `instructoraDeRanura`). */
const TARDE: Ranura[] = [
  { hora: "17:00", tipo: "Reformer", duracionMin: 50 },
  { hora: "18:00", tipo: "Reformer", duracionMin: 50 },
  { hora: "18:00", tipo: "Mat", duracionMin: 55 },
  { hora: "19:00", tipo: "Reformer", duracionMin: 50 },
];

const PRIVADA: Ranura = { hora: "16:00", tipo: "Privada", duracionMin: 55 };

/** Índice = día de la semana con **lunes 0** (ver `diaSemana`). El domingo
 *  cierra: por eso es un array vacío y no una excepción en el bucle. */
const HORARIO_SEMANAL: Ranura[][] = [
  [...MANANA, ...TARDE], // lun
  [...MANANA, ...TARDE, PRIVADA], // mar
  [...MANANA, ...TARDE], // mié
  [...MANANA, ...TARDE, PRIVADA], // jue
  [...MANANA, ...TARDE], // vie
  [
    { hora: "07:00", tipo: "Reformer", duracionMin: 50 },
    { hora: "08:00", tipo: "Reformer", duracionMin: 50 },
    { hora: "09:00", tipo: "Mat", duracionMin: 55 },
  ], // sáb
  [], // dom — cerrado
];

/**
 * Quién puede dar clase.
 *
 * ⚠️ **Se DERIVA de `EQUIPO`**, no es una lista aparte. Escrita a mano, dar de
 * baja a alguien en `/admin/usuarios` la dejaría dando clases aquí — justo el
 * fallo que ya se corrigió haciendo que `MEMBRESIAS_POR_VENCER` saliera de
 * `CLIENTES`.
 */
const IDS_INSTRUCTORAS = EQUIPO.filter(
  (m) => m.rol === "Instructora" && m.activo,
).map((m) => m.id);

/**
 * Reparto de instructoras por índice de ranura, desplazado un puesto cada día.
 *
 * ⚠️ **Que sea por índice es lo que impide generar un horario imposible.** Dos
 * ranuras consecutivas nunca reciben la misma instructora (hay 3 activas), y las
 * únicas clases simultáneas de la plantilla —las dos de las 18:00— están
 * justamente en posiciones consecutivas. Sin esto, los datos de ejemplo podrían
 * contradecir la validación de solapamiento del propio formulario.
 */
function instructoraDeRanura(indice: number, diasDesdeInicio: number): string {
  return IDS_INSTRUCTORAS[(indice + diasDesdeInicio) % IDS_INSTRUCTORAS.length];
}

/**
 * Hash FNV-1a de una cadena.
 *
 * Sustituye a `Math.random()` para todo lo que tiene que *parecer* variado sin
 * *ser* aleatorio: mismo id, mismo resultado, en el build y en el navegador.
 */
function siembra(texto: string): number {
  let h = 2_166_136_261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16_777_619);
  }
  return h >>> 0;
}

/** Ventana de la agenda: dos semanas atrás (para que «Finalizada» tenga algo que
 *  enseñar) y tres por delante (que es lo que se programa de verdad). */
const DIAS_ATRAS = 14;
const DIAS_ADELANTE = 21;

/**
 * El horario completo, ordenado por fecha y hora.
 *
 * ⚠️ **`reservas` es lo único inventado que dejará de escribirse.** Cuando
 * exista la vista de cliente será un `COUNT` sobre la tabla de reservas; aquí es
 * un hash del id acotado para que lo lejano se vea menos lleno que lo inmediato,
 * que es como se llena una agenda de verdad.
 */
export const CLASES: Clase[] = (() => {
  const clases: Clase[] = [];

  for (let d = -DIAS_ATRAS; d <= DIAS_ADELANTE; d++) {
    const fecha = sumarDias(HOY, d);
    const ranuras = HORARIO_SEMANAL[diaSemana(fecha)];

    ranuras.forEach((r, i) => {
      /* La inicial del tipo entra en el id porque las dos clases de las 18:00
         comparten fecha y hora: sin ella, tendrían el mismo id. */
      const id = `c-${fecha}-${r.hora.replace(":", "")}-${r.tipo[0]}`;
      const cupos = CUPOS_SUGERIDOS[r.tipo];

      /* Una clase a tres semanas vista con 8 de 8 reservas no se cree nadie:
         más allá de una semana el techo baja a la mitad del aforo. */
      const techo =
        diasEntre(HOY, fecha) > 7 ? Math.ceil(cupos / 2) : cupos;

      clases.push({
        id,
        tipo: r.tipo,
        fecha,
        horaInicio: r.hora,
        duracionMin: r.duracionMin,
        instructoraId: instructoraDeRanura(i, d + DIAS_ATRAS),
        cupos,
        reservas: siembra(id) % (techo + 1),
        /* ~2 % de las clases anuladas: las justas para que el estado exista en
           pantalla sin que la agenda parezca rota. */
        cancelada: siembra(`${id}-anulada`) % 45 === 0,
      });
    });
  }

  return clases.sort((a, b) =>
    a.fecha === b.fecha
      ? a.horaInicio.localeCompare(b.horaInicio)
      : a.fecha.localeCompare(b.fecha),
  );
})();
