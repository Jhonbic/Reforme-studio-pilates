// Descarga TODOS los buckets de Supabase Storage de un proyecto a una carpeta
// (una subcarpeta por bucket): los comprobantes de Reforme, las fotos de
// JainSportBox. El volcado SQL solo guarda la ruta de cada archivo, no el
// archivo. Lo usa `respaldar-proyecto.ps1`.
//
// Uso:
//   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=... \
//     node descargar-storage.mjs <carpeta-destino>
//
// Sin dependencias: solo `fetch` de Node 18+.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
const destino = process.argv[2];

if (!url || !clave || !destino) {
  console.error("Faltan SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o la carpeta de destino.");
  process.exit(1);
}

const cabeceras = { apikey: clave, Authorization: `Bearer ${clave}` };

async function pedir(ruta, opciones = {}) {
  const r = await fetch(`${url}/storage/v1/${ruta}`, { ...opciones, headers: { ...cabeceras, ...opciones.headers } });
  if (!r.ok) throw new Error(`${ruta}: ${r.status} ${await r.text()}`);
  return r;
}

/** Lista una carpeta de un bucket, entrando en las subcarpetas (en la
 *  respuesta, una entrada sin `id` es una carpeta). */
async function listar(bucket, prefijo) {
  const archivos = [];
  for (let offset = 0; ; offset += 1000) {
    const r = await pedir(`object/list/${bucket}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: prefijo, limit: 1000, offset }),
    });
    const entradas = await r.json();
    for (const e of entradas) {
      const ruta = prefijo ? `${prefijo}/${e.name}` : e.name;
      if (e.id === null) archivos.push(...(await listar(bucket, ruta)));
      else archivos.push(ruta);
    }
    if (entradas.length < 1000) return archivos;
  }
}

const buckets = await (await pedir("bucket")).json();
let total = 0;
for (const { id: bucket } of buckets) {
  const archivos = await listar(bucket, "");
  for (const ruta of archivos) {
    const r = await pedir(`object/${bucket}/${ruta.split("/").map(encodeURIComponent).join("/")}`);
    const archivo = join(destino, bucket, ...ruta.split("/"));
    await mkdir(dirname(archivo), { recursive: true });
    await writeFile(archivo, Buffer.from(await r.arrayBuffer()));
  }
  console.log(`  bucket «${bucket}»: ${archivos.length} archivos`);
  total += archivos.length;
}
console.log(`Archivos descargados: ${total}`);
