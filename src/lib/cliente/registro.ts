/**
 * Las reglas del registro web, en UN solo sitio: las usan el formulario de
 * `/registro` (para avisar al momento) y la server action `registrarCliente`
 * (para no fiarse del navegador). Si vivieran en los dos lados por separado,
 * acabarían diciendo cosas distintas.
 *
 * Sin React y sin `"use server"`: funciones puras, con tests.
 */

import {
  MAYORIA_DE_EDAD,
  edad,
  esCorreo,
  esMovilCO,
  esNombreCompleto,
} from "@/lib/validacion";

/* Los menores ya pueden registrarse (con su acudiente), así que entra la T.I.
   El R.C. no: es de menores de 7 años, que no se registran solos en la web. */
export const TIPOS_REGISTRO = [
  { valor: "C.C.", texto: "Cédula de ciudadanía" },
  { valor: "T.I.", texto: "Tarjeta de identidad" },
  { valor: "C.E.", texto: "Cédula de extranjería" },
  { valor: "Pasaporte", texto: "Pasaporte" },
] as const;

export type TipoRegistro = (typeof TIPOS_REGISTRO)[number]["valor"];

export const DIRECCION_MAX = 200;

export type FichaRegistro = {
  nombre: string;
  tipoIdentificacion: string;
  identificacion: string;
  /** ISO corto, `AAAA-MM-DD`. */
  fechaNacimiento: string;
  correo: string;
  /** Dígitos en crudo. */
  telefono: string;
  direccion: string;
  emergenciaNombre: string;
  emergenciaTelefono: string;
  /** Solo cuenta si es menor de edad; si no, se ignora. */
  acudiente: { nombre: string; identificacion: string; telefono: string };
  contrasena: string;
  aceptaTerminos: boolean;
};

/** Los campos que pueden llevar error, en el ORDEN de los pasos del
 *  formulario (datos → emergencia → cuenta): el primero con error es el que
 *  devuelve el servidor y al que va el foco. */
export const CAMPOS_REGISTRO = [
  "nombre",
  "identificacion",
  "fechaNacimiento",
  "telefono",
  "direccion",
  "emergenciaNombre",
  "emergenciaTelefono",
  "acudienteNombre",
  "acudienteIdentificacion",
  "acudienteTelefono",
  "correo",
  "contrasena",
  "aceptaTerminos",
] as const;

export type CampoRegistro = (typeof CAMPOS_REGISTRO)[number];
export type ErroresRegistro = Partial<Record<CampoRegistro, string>>;

const DOCUMENTO = /^[A-Z0-9]{4,15}$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * ¿Es menor de edad? `null` = no se sabe todavía (sin fecha, o sin «hoy»).
 * Nunca se afirma «es mayor» desde un dato que falta.
 */
export function esMenorDeEdad(fechaNacimiento: string, hoy: string): boolean | null {
  if (!hoy || !FECHA.test(fechaNacimiento)) return null;
  const anios = edad(fechaNacimiento, hoy);
  return anios === null ? null : anios < MAYORIA_DE_EDAD;
}

/**
 * Todos los errores de una ficha, por campo. Vacío = se puede registrar.
 *
 * `hoy` en el servidor es la fecha de Bogotá (`hoyEnBogota()`), y la minoría
 * de edad se decide con ELLA: si se creyera la del navegador, bastaría con no
 * mandar acudiente.
 *
 * Vacío y mal escrito llevan mensajes distintos: «escribe tu teléfono» no es
 * lo mismo que «ese teléfono no vale».
 */
export function erroresRegistro(f: FichaRegistro, hoy: string): ErroresRegistro {
  const e: ErroresRegistro = {};
  const menor = esMenorDeEdad(f.fechaNacimiento, hoy);

  if (!f.nombre.trim()) e.nombre = "Escribe tu nombre completo.";
  else if (!esNombreCompleto(f.nombre)) e.nombre = "Escribe tu nombre y apellido.";

  if (!TIPOS_REGISTRO.some((t) => t.valor === f.tipoIdentificacion))
    e.identificacion = "Tipo de documento no válido.";
  else if (!f.identificacion) e.identificacion = "Escribe tu número de documento.";
  else if (!DOCUMENTO.test(f.identificacion)) e.identificacion = "Número de documento no válido.";
  /* La C.C. se expide a los 18: un menor con C.C. es un error de tipo (o de
     fecha), y guardarlo así dejaría la ficha mal para siempre. */
  else if (menor === true && f.tipoIdentificacion === "C.C.")
    e.identificacion = "Si eres menor de edad, tu documento es la tarjeta de identidad.";

  if (!f.fechaNacimiento) e.fechaNacimiento = "Escribe tu fecha de nacimiento.";
  else if (!FECHA.test(f.fechaNacimiento) || f.fechaNacimiento < "1900-01-01" || (hoy && f.fechaNacimiento > hoy))
    e.fechaNacimiento = "Fecha de nacimiento no válida.";

  if (!f.correo.trim()) e.correo = "Escribe tu correo.";
  else if (!esCorreo(f.correo)) e.correo = "Introduce un correo válido.";

  if (!f.telefono) e.telefono = "Escribe tu teléfono.";
  else if (!esMovilCO(f.telefono)) e.telefono = "Un móvil colombiano son 10 dígitos y empieza por 3.";

  const direccion = f.direccion.trim();
  if (!direccion) e.direccion = "Escribe tu dirección.";
  else if (direccion.length < 5) e.direccion = "Escribe la dirección completa.";
  else if (direccion.length > DIRECCION_MAX) e.direccion = "La dirección es demasiado larga.";

  if (!f.emergenciaNombre.trim()) e.emergenciaNombre = "Escribe el nombre de tu contacto de emergencia.";
  else if (!esNombreCompleto(f.emergenciaNombre)) e.emergenciaNombre = "Escribe su nombre y apellido.";

  if (!f.emergenciaTelefono) e.emergenciaTelefono = "Escribe su teléfono.";
  else if (!esMovilCO(f.emergenciaTelefono))
    e.emergenciaTelefono = "Un móvil colombiano son 10 dígitos y empieza por 3.";
  /* Un adulto con su propio número como emergencia no tiene emergencia. A un
     menor sí se le deja: su móvil puede ser el de su madre. */
  else if (menor === false && f.emergenciaTelefono === f.telefono)
    e.emergenciaTelefono = "Tiene que ser el teléfono de otra persona.";

  if (menor === true) {
    const a = f.acudiente;
    if (!a.nombre.trim()) e.acudienteNombre = "Escribe el nombre de tu acudiente.";
    else if (!esNombreCompleto(a.nombre)) e.acudienteNombre = "Escribe su nombre y apellido.";

    if (!a.identificacion) e.acudienteIdentificacion = "Escribe su número de documento.";
    else if (!DOCUMENTO.test(a.identificacion)) e.acudienteIdentificacion = "Número de documento no válido.";
    else if (a.identificacion === f.identificacion)
      e.acudienteIdentificacion = "Tiene que ser el documento de tu acudiente, no el tuyo.";

    if (!a.telefono) e.acudienteTelefono = "Escribe su teléfono.";
    else if (!esMovilCO(a.telefono))
      e.acudienteTelefono = "Un móvil colombiano son 10 dígitos y empieza por 3.";
  }

  if (f.contrasena.length < 8) e.contrasena = "Mínimo 8 caracteres.";

  if (!f.aceptaTerminos)
    e.aceptaTerminos =
      menor === true
        ? "Tu acudiente tiene que aceptar los términos para continuar."
        : "Debes aceptar los términos para continuar.";

  return e;
}
