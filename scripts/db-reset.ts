/**
 * `npm run db:reset` — reconstruye la base LOCAL desde cero y deja un admin de
 * desarrollo con el que entrar al momento.
 *
 *   1. `supabase db reset`: borra la base local y aplica las migraciones y la
 *      semilla (`supabase/seed.sql`), igual que se aplicarían en una nueva.
 *   2. Crea `ADMIN_DEV` en Auth y su ficha en `equipo` como Administración.
 *
 * ⚠️ **El admin NO va en `seed.sql`, y es a propósito.** La semilla también se
 * puede subir a la base real (`db push --include-seed`), y allí una cuenta de
 * contraseña conocida y escrita en el repo sería una puerta trasera. Aquí va en
 * un script que **se niega a correr si la API no está en esta máquina**.
 *
 * Las claves no se leen de ningún `.env`: se piden a `supabase status`, que
 * solo conoce las de la instancia local. Así no hay forma de que este script
 * reciba por error las de producción.
 */

import { execSync } from "node:child_process";
import { exit } from "node:process";
import { createClient } from "@supabase/supabase-js";

/** Cuenta de desarrollo. Solo existe en la base local. */
const ADMIN_DEV = {
  correo: "admin@reforme.local",
  contrasena: "reforme-local",
  nombre: "Admin de desarrollo",
} as const;

function sh(cmd: string, silencioso = false): string {
  return execSync(cmd, {
    encoding: "utf8",
    stdio: silencioso ? ["ignore", "pipe", "pipe"] : ["ignore", "pipe", "inherit"],
  });
}

/** `supabase status -o env` → { API_URL: "...", SECRET_KEY: "...", … } */
function estadoLocal(): Record<string, string> {
  const salida = sh("npx supabase status -o env", true);
  return Object.fromEntries(
    salida
      .split(/\r?\n/)
      .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => [m[1], m[2]]),
  );
}

async function main() {
  let estado: Record<string, string>;
  try {
    estado = estadoLocal();
  } catch {
    console.error(
      "\n✗ La base local no está levantada. Abre Docker Desktop y ejecuta:\n  npx supabase start\n",
    );
    exit(1);
  }

  const url = estado.API_URL;
  const secreta = estado.SECRET_KEY ?? estado.SERVICE_ROLE_KEY;

  // ⚠️ La guarda que justifica que este archivo exista: nunca contra un host
  // que no sea esta máquina.
  const host = url ? new URL(url).hostname : "";
  if (!["127.0.0.1", "localhost"].includes(host) || !secreta) {
    console.error(`\n✗ Esto solo corre contra la base local, y la API es «${url}».`);
    exit(1);
  }

  console.log("Reconstruyendo la base local (migraciones + semilla)…\n");
  sh("npx supabase db reset");

  const supabase = createClient(url, secreta, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.admin.createUser({
    email: ADMIN_DEV.correo,
    password: ADMIN_DEV.contrasena,
    email_confirm: true,
    user_metadata: { nombre: ADMIN_DEV.nombre },
  });
  if (error) throw error;

  const { error: fallo } = await supabase.from("equipo").insert({
    nombre: ADMIN_DEV.nombre,
    correo: ADMIN_DEV.correo,
    rol: "Administración",
    cuenta_id: data.user.id,
  });
  if (fallo) throw fallo;

  console.log(`
✓ Base local lista.
  Panel:   http://localhost:3000/login  →  ${ADMIN_DEV.correo} / ${ADMIN_DEV.contrasena}
  Studio:  ${estado.STUDIO_URL ?? "http://127.0.0.1:54323"}
  Correos: ${estado.MAILPIT_URL ?? estado.INBUCKET_URL ?? "http://127.0.0.1:54324"}
`);
}

main().catch((e) => {
  console.error("\n✗", e?.message ?? e);
  exit(1);
});
