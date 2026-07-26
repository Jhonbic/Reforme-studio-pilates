import type { Cliente, FichaAlta, MiembroEquipo } from "@/lib/admin/types";

/**
 * Exportación del listado a CSV.
 *
 * **Esto funciona de verdad**, a diferencia del alta: los datos ya están en el
 * navegador, así que no hace falta backend para descargarlos. Es la única acción
 * real de la pantalla mientras no haya base de datos.
 */

/* Excel en español interpreta la coma como separador decimal, no de columnas:
   con `,` un CSV de estos abre todo apelotonado en la columna A. El `;` es el
   separador de listas del locale es-CO. */
const SEP = ";";

/** Solo se entrecomilla lo que puede romper la fila. Los números se dejan a
 *  pelo: entrecomillados, Excel los trataría como texto y no se podrían sumar. */
function celda(v: string | number | null): string {
  if (v === null) return "";
  if (typeof v === "number") return String(v);
  return /["\n\r;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function aCsv(cabeceras: string[], filas: (string | number | null)[][]): string {
  return [cabeceras, ...filas]
    .map((f) => f.map(celda).join(SEP))
    .join("\r\n");
}

export function csvClientes(clientes: Cliente[]): string {
  return aCsv(
    [
      "Nombre",
      "Identificación",
      "Correo",
      "Teléfono",
      "Plan",
      "Estado",
      "Vencimiento",
      "Alta",
      "Última asistencia",
      "Importe renovación",
    ],
    clientes.map((c) => [
      c.nombre,
      c.identificacion,
      c.correo,
      c.telefono,
      c.plan,
      c.estado,
      // Las fechas van en ISO y no formateadas: así Excel las ordena y las
      // entiende como fechas. «5 feb 2024» sería texto.
      c.vencimiento,
      c.alta,
      c.ultimaAsistencia,
      c.importeRenovacion,
    ]),
  );
}

export function csvEquipo(equipo: MiembroEquipo[]): string {
  return aCsv(
    ["Nombre", "Correo", "Teléfono", "Rol", "Clases por semana", "Activo", "Alta"],
    equipo.map((m) => [
      m.nombre,
      m.correo,
      m.telefono,
      m.rol,
      m.clasesSemana,
      m.activo ? "Sí" : "No",
      m.alta,
    ]),
  );
}

/**
 * La ficha de UN cliente del listado, en dos columnas.
 *
 * ⚠️ No es `csvClientes` con una sola fila. Un listado se abre para ordenar,
 * filtrar y sumar —por eso va en columnas—, mientras que la ficha de una
 * persona se abre para leerla: en horizontal habría que ir arrastrando la barra
 * lateral para ver los diez campos. Es la misma decisión, y por el mismo
 * motivo, que ya tomó `csvFicha`.
 *
 * Fechas en ISO e importe sin `$`, como en todo este archivo: formateados,
 * Excel los tomaría por texto.
 */
export function csvCliente(c: Cliente): string {
  return aCsv(
    ["Campo", "Valor"],
    [
      ["Nombre", c.nombre],
      ["Identificación", c.identificacion],
      ["Correo", c.correo],
      ["Teléfono", c.telefono],
      ["Plan", c.plan],
      ["Estado", c.estado],
      ["Vencimiento", c.vencimiento],
      ["Alta", c.alta],
      ["Última asistencia", c.ultimaAsistencia],
      ["Importe renovación", c.importeRenovacion],
    ],
  );
}

/**
 * La ficha de un alta recién rellenada.
 *
 * ⚠️ **No añade columnas a `csvClientes`.** Son dos cosas distintas: una ficha de
 * admisión tiene EPS, acudiente y contacto de emergencia, datos que los 118
 * clientes del listado no tienen. Mezclarlas dejaría 118 filas con la mitad de
 * las celdas vacías y rompería cualquier plantilla de Excel ya guardada.
 *
 * Va en **dos columnas, campo y valor**, y no en una fila ancha: es una sola
 * persona, y así se lee de un vistazo al abrirla.
 */
export function csvFicha(f: FichaAlta): string {
  const filas: [string, string][] = [
    ["Nombre", f.nombre],
    ["Tipo de documento", f.tipoIdentificacion],
    ["Número de documento", f.identificacion],
    ["Fecha de nacimiento", f.fechaNacimiento],
    ["Teléfono", f.telefono],
    ["Correo", f.correo],
    ["EPS", f.eps],
    ["Contacto de emergencia", f.contactoEmergencia.nombre],
    ["Teléfono de emergencia", f.contactoEmergencia.telefono],
  ];

  if (f.acudiente) {
    filas.push(
      ["Acudiente", f.acudiente.nombre],
      ["Cédula del acudiente", f.acudiente.identificacion],
      ["Teléfono del acudiente", f.acudiente.telefono],
    );
  }

  filas.push(["Acepta términos", f.aceptaTerminos ? "Sí" : "No"]);

  return aCsv(["Campo", "Valor"], filas);
}

/**
 * Lanza la descarga del CSV.
 *
 * ⚠️ El **BOM (`﻿`) no es opcional**: sin él, Excel en Windows abre el
 * archivo con la codificación del sistema y «Gutiérrez» sale como «GutiÃ©rrez».
 * Los tildes de este listado no son un caso raro, son la mayoría.
 *
 * ⚠️ El `URL.revokeObjectURL` tampoco: sin él, el Blob se queda retenido en
 * memoria hasta que se recarga la página, y aquí se puede exportar muchas veces.
 * Pero va **diferido**, no justo después del `click()`: revocarlo en el mismo
 * tick puede cortar la descarga antes de que el navegador haya leído el Blob.
 *
 * ⚠️ El `<a>` se **inserta en el DOM** antes de pulsarlo. Un `<a>` suelto en
 * memoria no dispara la descarga en todos los navegadores, y este método se
 * llama dos veces seguidas cuando se exportan los dos listados.
 */
export function descargarCsv(nombreArchivo: string, csv: string): void {
  const blob = new Blob([`﻿${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.style.display = "none";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
