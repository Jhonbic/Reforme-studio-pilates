// Descarga todos los archivos del bucket privado `comprobantes` (las fotos y
// PDF de los gastos) a una carpeta local. Lo usan la copia nocturna de GitHub
// Actions y `scripts/respaldar.ps1`: el volcado SQL guarda la RUTA de cada
// comprobante, no el archivo.
//
// Uso:
//   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=... \
//     node scripts/descargar-comprobantes.mjs <carpeta-destino>
//
// Sin dependencias: solo `fetch` de Node 18+.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const BUCKET = "comprobantes";
const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
const destino = process.argv[2];

if (!url || !clave || !destino) {
  console.error("Faltan SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o la carpeta de destino.");
  process.exit(1);
}

const cabeceras = { apikey: clave, Authorization: `Bearer ${clave}` };

/** Lista una carpeta del bucket. En la respuesta, una entrada sin `id` es una
 *  subcarpeta y hay que entrar en ella. */
async function listar(prefijo) {
  const archivos = [];
  for (let offset = 0; ; offset += 1000) {
    const r = await fetch(`${url}/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: { ...cabeceras, "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: prefijo, limit: 1000, offset }),
    });
    if (!r.ok) throw new Error(`No se pudo listar «${prefijo || "/"}»: ${r.status} ${await r.text()}`);
    const entradas = await r.json();
    for (const e of entradas) {
      const ruta = prefijo ? `${prefijo}/${e.name}` : e.name;
      if (e.id === null) archivos.push(...(await listar(ruta)));
      else archivos.push(ruta);
    }
    if (entradas.length < 1000) return archivos;
  }
}

const archivos = await listar("");
for (const ruta of archivos) {
  const r = await fetch(`${url}/storage/v1/object/${BUCKET}/${ruta.split("/").map(encodeURIComponent).join("/")}`, {
    headers: cabeceras,
  });
  if (!r.ok) throw new Error(`No se pudo descargar «${ruta}»: ${r.status}`);
  const archivo = join(destino, ...ruta.split("/"));
  await mkdir(dirname(archivo), { recursive: true });
  await writeFile(archivo, Buffer.from(await r.arrayBuffer()));
}
console.log(`Comprobantes descargados: ${archivos.length}`);
