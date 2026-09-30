/**
 * Alta de personal del estudio: `npm run alta-personal`.
 *
 * Crea la ficha en `equipo` y, si la persona va a entrar a la app, su cuenta en
 * Supabase Auth ya confirmada. Es también cómo se crea el PRIMER administrador,
 * que no puede darse de alta desde un panel al que todavía no puede entrar.
 *
 * ⚠️ **Usa la clave SECRETA de Supabase, y por eso es un script y no una
 * pantalla.** Crear la cuenta de otra persona solo se puede con esa clave, que
 * se salta RLS entera. Vive en `.env.admin`, que no se versiona, solo existe en
 * el PC de quien desarrolla y nunca llega a Netlify ni al navegador. La app
 * sigue funcionando sin ella: la regla de `.env.example` no cambia.
 *
 * Qué datos se piden y cómo se validan está en `src/lib/personal.ts`, no aquí.
 */

import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";
import { stdin, stdout, exit } from "node:process";
import {
  CONTRASENA_MIN,
  PERMISOS_ROL,
  ROLES_PERSONAL,
  limpiarAlta,
  validarAlta,
  type AltaPersonal,
  type RolPersonal,
} from "../src/lib/personal.ts";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRETA = process.env.SUPABASE_SECRET_KEY;

if (!URL || !SECRETA) {
  console.error(
    "\nFalta configuración:\n" +
      (URL ? "" : "  · NEXT_PUBLIC_SUPABASE_URL en .env.local\n") +
      (SECRETA
        ? ""
        : "  · SUPABASE_SECRET_KEY en .env.admin (copia .env.admin.example)\n"),
  );
  exit(1);
}

const supabase = createClient(URL, SECRETA, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const rl = createInterface({ input: stdin, output: stdout });

/** Pregunta hasta que `validar` devuelva `null`. */
async function preguntar(
  texto: string,
  validar: (v: string) => string | null = () => null,
): Promise<string> {
  for (;;) {
    const v = (await rl.question(texto)).trim();
    const error = validar(v);
    if (!error) return v;
    console.log(`  ✗ ${error}`);
  }
}

/**
 * Lee sin mostrar lo que se teclea.
 *
 * ⚠️ Se aparta `readline` mientras tanto: si los dos escuchan `stdin` a la vez,
 * readline repetiría en pantalla cada tecla que aquí se está ocultando.
 */
function leerOculto(texto: string): Promise<string> {
  return new Promise((resolve) => {
    rl.pause();
    stdout.write(texto);
    stdin.setRawMode?.(true);
    stdin.resume();
    let valor = "";

    const alPulsar = (buf: Buffer) => {
      for (const c of buf.toString("utf8")) {
        if (c === "\r" || c === "\n") {
          stdin.setRawMode?.(false);
          stdin.off("data", alPulsar);
          stdout.write("\n");
          rl.resume();
          resolve(valor);
          return;
        }
        if (c === "\u0003") exit(130); // Ctrl+C
        if (c === "\u007f" || c === "\b") valor = valor.slice(0, -1);
        else valor += c;
      }
    };
    stdin.on("data", alPulsar);
  });
}

async function siNo(texto: string, porDefecto: boolean): Promise<boolean> {
  const v = (await rl.question(`${texto} ${porDefecto ? "[S/n]" : "[s/N]"} `))
    .trim()
    .toLowerCase();
  return v === "" ? porDefecto : v.startsWith("s");
}

/** Pregunta un campo y lo valida con las reglas de `personal.ts`, para que el
 *  error salga en el momento y no después de haber rellenado todo. */
function campo(clave: keyof AltaPersonal, base: Partial<AltaPersonal>) {
  return (v: string) => {
    const prueba = limpiarAlta({
      nombre: "Ficha de prueba",
      correo: "prueba@reforme.com",
      telefono: null,
      rol: "Recepción",
      clasesSemana: 0,
      contrasena: null,
      ...base,
      [clave]: v === "" && clave === "telefono" ? null : v,
    } as AltaPersonal);
    return validarAlta(prueba)[clave] ?? null;
  };
}

async function main() {
  console.log("\nAlta de personal · Reforme Studio Pilates\n");

  const nombre = await preguntar("Nombre y apellidos: ", campo("nombre", {}));
  const correo = await preguntar("Correo: ", campo("correo", {}));
  const telefono = await preguntar(
    "Móvil (opcional, Enter para omitir): ",
    campo("telefono", {}),
  );

  console.log("\nRol:");
  ROLES_PERSONAL.forEach((r, i) =>
    console.log(`  ${i + 1}. ${r} — ${PERMISOS_ROL[r]}`),
  );
  const iRol = await preguntar("Elige 1-3: ", (v) =>
    /^[1-3]$/.test(v) ? null : "Escribe 1, 2 o 3.",
  );
  const rol: RolPersonal = ROLES_PERSONAL[Number(iRol) - 1];

  const clasesSemana =
    rol === "Instructora"
      ? Number(
          await preguntar("Clases por semana: ", (v) =>
            /^\d+$/.test(v) ? null : "Un número entero, 0 o más.",
          ),
        )
      : 0;

  // Una instructora que solo da clases no necesita entrar; el resto, sí.
  const conAcceso = await siNo(
    "\n¿Va a entrar a la app?",
    rol !== "Instructora",
  );

  let contrasena: string | null = null;
  while (conAcceso && contrasena === null) {
    const p1 = await leerOculto(`Contraseña (mín. ${CONTRASENA_MIN}): `);
    if (p1.length < CONTRASENA_MIN) {
      console.log(`  ✗ Mínimo ${CONTRASENA_MIN} caracteres.`);
      continue;
    }
    const p2 = await leerOculto("Repítela: ");
    if (p1 !== p2) console.log("  ✗ No coinciden.");
    else contrasena = p1;
  }

  const alta = limpiarAlta({
    nombre,
    correo,
    telefono: telefono || null,
    rol,
    clasesSemana,
    contrasena,
  });

  // Segunda pasada sobre el conjunto: los campos ya se validaron de uno en uno,
  // pero es la misma función que usará el panel y no cuesta nada.
  const errores = Object.values(validarAlta(alta));
  if (errores.length) {
    console.error(`\n✗ ${errores.join("\n✗ ")}`);
    exit(1);
  }

  console.log(`
  Nombre     ${alta.nombre}
  Correo     ${alta.correo}
  Móvil      ${alta.telefono ?? "—"}
  Rol        ${alta.rol}${alta.rol === "Instructora" ? ` · ${alta.clasesSemana} clases/semana` : ""}
  Acceso     ${alta.contrasena ? "sí, entra con ese correo" : "no, solo en la plantilla"}
`);
  if (!(await siNo("¿Crear?", true))) exit(0);

  await guardar(alta);
}

async function guardar(alta: AltaPersonal) {
  /* ¿Ya hay ficha con ese correo? Pasa con la plantilla de ejemplo de la
     semilla: la persona existe y solo le falta la cuenta. */
  const { data: existente, error: fallo } = await supabase
    .from("equipo")
    .select("id, nombre, rol, cuenta_id")
    // `eq` y no `ilike`: en `ilike` el `_` es comodín, y los correos lo llevan.
    // Ambos lados ya van en minúsculas (`limpiarAlta` y la semilla).
    .eq("correo", alta.correo)
    .maybeSingle();

  if (fallo) throw fallo;

  if (existente?.cuenta_id) {
    console.error(`\n✗ ${existente.nombre} ya tiene cuenta con ese correo.`);
    exit(1);
  }
  if (existente && !alta.contrasena) {
    console.error(`\n✗ Ya hay una ficha con ese correo: ${existente.nombre}.`);
    exit(1);
  }
  if (existente) {
    const seguir = await siNo(
      `\nYa hay una ficha para ese correo (${existente.nombre}, ${existente.rol}).` +
        "\n¿Darle acceso y sobrescribirla con los datos de ahora?",
      false,
    );
    if (!seguir) exit(0);
  }

  let cuentaId: string | null = null;

  if (alta.contrasena) {
    /* `email_confirm: true`: la cuenta nace confirmada. Si no, Supabase
       esperaría a que se pulse un correo que no llega, porque todavía no hay
       SMTP configurado. Aquí quien crea la cuenta ya sabe que el correo es
       suyo o de su compañera. */
    const { data, error } = await supabase.auth.admin.createUser({
      email: alta.correo,
      password: alta.contrasena,
      email_confirm: true,
      user_metadata: { nombre: alta.nombre },
    });

    if (error) {
      console.error(
        error.code === "email_exists"
          ? "\n✗ Ese correo ya tiene cuenta en Supabase Auth, pero sin ficha." +
              "\n  Bórrala en Authentication → Users y vuelve a lanzar el alta."
          : `\n✗ No se pudo crear la cuenta: ${error.message}`,
      );
      exit(1);
    }
    cuentaId = data.user.id;
  }

  const fila = {
    nombre: alta.nombre,
    correo: alta.correo,
    telefono: alta.telefono,
    rol: alta.rol,
    clases_semana: alta.clasesSemana,
    activo: true,
    cuenta_id: cuentaId,
  };

  const { error } = existente
    ? await supabase.from("equipo").update(fila).eq("id", existente.id)
    : await supabase.from("equipo").insert(fila);

  if (error) {
    /* ⚠️ Sin esto quedaría una cuenta que entra y no ve nada, y al reintentar
       chocaría con «ese correo ya tiene cuenta». Se deshace lo que sí salió. */
    if (cuentaId) await supabase.auth.admin.deleteUser(cuentaId);
    console.error(`\n✗ No se pudo guardar la ficha: ${error.message}`);
    exit(1);
  }

  console.log(
    `\n✓ ${alta.nombre} dada de alta como ${alta.rol}.` +
      (cuentaId ? `\n  Ya puede entrar en /login con ${alta.correo}.` : ""),
  );
}

main()
  .catch((e) => {
    // Los errores de supabase-js (`PostgrestError`) no heredan de `Error`, pero
    // traen `message`: sin mirarlo se imprimía el objeto entero.
    const msg: string = e?.message ?? String(e);
    console.error(
      e?.code === "PGRST205"
        ? `\n✗ ${msg}\n  Ese proyecto de Supabase no tiene el esquema: falta aplicar` +
            "\n  las migraciones, o NEXT_PUBLIC_SUPABASE_URL apunta a otro proyecto."
        : `\n✗ ${msg}`,
    );
    exit(1);
  })
  .finally(() => rl.close());
