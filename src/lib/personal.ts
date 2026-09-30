/**
 * Qué hace falta para dar de alta a alguien del PERSONAL del estudio.
 *
 * Es la definición única: hoy la usa `scripts/alta-personal.ts`, y el día que el
 * panel tenga un «Nuevo miembro» tiene que validar con esto mismo — si no, el
 * script y el formulario acabarían aceptando cosas distintas.
 *
 * Una persona del personal es UNA ficha en `equipo`, y la cuenta de acceso es
 * opcional: una instructora que solo da clases está en la plantilla y no entra
 * a la app. Ver `supabase/migrations/20260930120000_personal_ficha_unica.sql`.
 *
 * ⚠️ Los imports llevan la extensión `.ts` a propósito: este archivo lo ejecuta
 * Node directamente (sin compilar) desde el script, y Node no la adivina.
 */

import {
  esCorreo,
  esMovilCO,
  normalizarTelefonoPegado,
  sinDigitos,
} from "./validacion.ts";

/** Mismo orden que el enum `rol_equipo`, de menos a más permisos. */
export const ROLES_PERSONAL = [
  "Instructora",
  "Recepción",
  "Administración",
] as const;

export type RolPersonal = (typeof ROLES_PERSONAL)[number];

/** Qué puede hacer cada rol, en palabras. Es el resumen de las policies de RLS
 *  para quien elige el rol sin haberlas leído. */
export const PERMISOS_ROL: Record<RolPersonal, string> = {
  Instructora: "ve clientes y planes; no ve dinero",
  Recepción: "gestiona clientes y registra pagos; no ve gastos",
  Administración: "todo, incluidos planes, gastos y el propio personal",
};

/** Mismo mínimo que `/registro` y `/nueva-contrasena`. */
export const CONTRASENA_MIN = 8;

export type AltaPersonal = {
  /** Nombre y apellidos, como se verá en el panel. */
  nombre: string;
  /** Correo de trabajo. Si tiene acceso, es también con el que entra. */
  correo: string;
  /** Móvil colombiano, 10 dígitos en crudo. Opcional. */
  telefono: string | null;
  rol: RolPersonal;
  /** Solo tiene sentido en instructoras; el resto va a 0. */
  clasesSemana: number;
  /** `null` = en la plantilla pero sin cuenta: no entra a la app. */
  contrasena: string | null;
};

/** Limpia lo tecleado igual que los formularios del panel: nombre sin dígitos
 *  y con espacios colapsados, correo en minúsculas, teléfono a dígitos (pegar
 *  «+57 320 907 8814» funciona). */
export function limpiarAlta(a: AltaPersonal): AltaPersonal {
  const telefono = a.telefono ? normalizarTelefonoPegado(a.telefono) : "";
  return {
    ...a,
    nombre: sinDigitos(a.nombre).trim().replace(/\s+/g, " "),
    correo: a.correo.trim().toLowerCase(),
    telefono: telefono || null,
    clasesSemana: a.rol === "Instructora" ? a.clasesSemana : 0,
  };
}

export type ErroresAlta = Partial<Record<keyof AltaPersonal, string>>;

/**
 * Los errores de una alta ya limpia. Objeto vacío = se puede guardar.
 *
 * Las reglas son las mismas `check` de la tabla `equipo`, dichas antes de
 * llegar a la base: así el error se lee en castellano y no como un `23514`.
 */
export function validarAlta(a: AltaPersonal): ErroresAlta {
  const e: ErroresAlta = {};

  if (a.nombre.length < 3) e.nombre = "Escribe nombre y apellidos.";
  if (!esCorreo(a.correo)) e.correo = "Ese correo no es válido.";
  if (a.telefono !== null && !esMovilCO(a.telefono))
    e.telefono = "Un móvil colombiano: 10 dígitos que empiezan por 3.";
  if (!ROLES_PERSONAL.includes(a.rol)) e.rol = "Rol desconocido.";
  if (!Number.isInteger(a.clasesSemana) || a.clasesSemana < 0)
    e.clasesSemana = "Un número entero, 0 o más.";
  if (a.contrasena !== null && a.contrasena.length < CONTRASENA_MIN)
    e.contrasena = `Mínimo ${CONTRASENA_MIN} caracteres.`;

  return e;
}
