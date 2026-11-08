import { DIRECCION_MAX } from "@/lib/cliente/registro";
import { esMovilCO, esNombreCompleto } from "@/lib/validacion";

/**
 * «Mi perfil» del área de cliente (nov 2026): los datos de CONTACTO que el
 * cliente puede corregir él mismo. Lo demás (nombre, correo, documento, fecha
 * de nacimiento, acudiente) lo corrige recepción.
 *
 * Las mismas reglas que el registro web (`registro.ts`), para que lo que se
 * aceptó al registrarse se pueda volver a guardar. Las usan el formulario y
 * la server action `guardarMisDatos`; la base las vuelve a comprobar
 * (`actualizar_mis_datos`).
 */

export type MisDatosEditables = {
  telefono: string;
  direccion: string;
  eps: string;
  emergenciaNombre: string;
  emergenciaTelefono: string;
};

export type ErroresPerfil = Partial<Record<keyof MisDatosEditables, string>>;

/** El orden en que se pintan: el primero con error es el que recibe el foco. */
export const CAMPOS_PERFIL: (keyof MisDatosEditables)[] = [
  "telefono",
  "eps",
  "direccion",
  "emergenciaNombre",
  "emergenciaTelefono",
];

/**
 * `menor`: si es menor de edad. A un adulto no se le deja poner su propio
 * número como contacto de emergencia (no sería un contacto); a un menor sí,
 * porque su móvil puede ser el de su madre. `null` = no se sabe (sin fecha de
 * nacimiento): se trata como adulto, igual que el registro.
 */
export function erroresPerfil(d: MisDatosEditables, menor: boolean | null): ErroresPerfil {
  const e: ErroresPerfil = {};
  if (!d.telefono) e.telefono = "Escribe tu teléfono.";
  else if (!esMovilCO(d.telefono)) e.telefono = "Un móvil colombiano son 10 dígitos y empieza por 3.";

  const direccion = d.direccion.trim();
  if (!direccion) e.direccion = "Escribe tu dirección.";
  else if (direccion.length < 5) e.direccion = "Escribe la dirección completa.";
  else if (direccion.length > DIRECCION_MAX) e.direccion = "La dirección es demasiado larga.";

  if (d.eps.trim().length > 80) e.eps = "El nombre de la EPS es demasiado largo.";

  if (!d.emergenciaNombre.trim()) e.emergenciaNombre = "Escribe el nombre de tu contacto de emergencia.";
  else if (!esNombreCompleto(d.emergenciaNombre)) e.emergenciaNombre = "Escribe su nombre y apellido.";

  if (!d.emergenciaTelefono) e.emergenciaTelefono = "Escribe su teléfono.";
  else if (!esMovilCO(d.emergenciaTelefono))
    e.emergenciaTelefono = "Un móvil colombiano son 10 dígitos y empieza por 3.";
  else if (menor !== true && d.emergenciaTelefono === d.telefono)
    e.emergenciaTelefono = "Tiene que ser el teléfono de otra persona.";
  return e;
}

/** ¿Cambió algo respecto a lo guardado? Sin cambios, «Guardar» va apagado. */
export function hayCambios(a: MisDatosEditables, b: MisDatosEditables): boolean {
  return CAMPOS_PERFIL.some((c) => a[c].trim() !== b[c].trim());
}
