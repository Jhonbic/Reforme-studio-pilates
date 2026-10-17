"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { hoyEnBogota } from "@/lib/admin/horario";
import type { TipoIdentificacion } from "@/lib/admin/types";
import {
  CAMPOS_REGISTRO,
  erroresRegistro,
  esMenorDeEdad,
  type FichaRegistro,
} from "@/lib/cliente/registro";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/server";
import { nombrePropio } from "@/lib/validacion";

export type Resultado = { ok: true } | { ok: false; error: string; campo?: string };

/* ======================================================================
   Registro
   ====================================================================== */

/** Las reglas de cada campo viven en `registro.ts`, compartidas con el
 *  formulario. Aquí solo se suma lo que es del servidor. */
export type DatosRegistro = FichaRegistro & {
  /** Campo trampa: invisible para personas. Si trae algo, es un robot. */
  trampa: string;
  /** Milisegundos que el formulario estuvo abierto antes de enviarse. */
  msAbierto: number;
};

/* Protección contra robots. Sin servicios externos (un CAPTCHA pide cuenta y
   claves): campo trampa, tiempo mínimo y límite de intentos por conexión. */
const MS_MINIMO = 3000;
const LIMITE_POR_IP = 10;
const LIMITE_GLOBAL = 60;
const VENTANA_MS = 60 * 60 * 1000;
const NO_SE_PUDO = "No se pudo completar el registro. Inténtalo de nuevo en un momento.";

type Admin = NonNullable<ReturnType<typeof crearClienteAdmin>>;

/**
 * Cuenta este intento y dice si hay que frenarlo: más de 10 por hora desde la
 * misma conexión, o más de 60 en total (un ataque desde muchas IP).
 *
 * La IP la pone Vercel en `x-forwarded-for`. Se guarda solo su hash.
 * ⚠️ Si la tabla falla, deja pasar (y lo registra): un fallo de esta
 * protección no puede cerrar el registro a los clientes de verdad.
 */
async function frenoDeRegistro(admin: Admin): Promise<string | null> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "sin-ip").trim();
  const ipHash = createHash("sha256").update(`reforme-registro|${ip}`).digest("hex");
  const desde = new Date(Date.now() - VENTANA_MS).toISOString();

  const [porIp, total] = await Promise.all([
    admin
      .from("intentos_registro")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("creado_en", desde),
    admin.from("intentos_registro").select("id", { count: "exact", head: true }).gte("creado_en", desde),
  ]);
  if (porIp.error || total.error) {
    console.error("Límite de registro sin comprobar:", porIp.error?.message ?? total.error?.message);
    return null;
  }
  if ((porIp.count ?? 0) >= LIMITE_POR_IP || (total.count ?? 0) >= LIMITE_GLOBAL) {
    return "Hay demasiados intentos de registro. Espera un rato o escríbenos por WhatsApp y te ayudamos.";
  }

  await admin.from("intentos_registro").insert({ ip_hash: ipHash });
  // Limpieza: lo de ayer ya no cuenta para nada. (Con WHERE: pg_safeupdate.)
  await admin
    .from("intentos_registro")
    .delete()
    .lt("creado_en", new Date(Date.now() - 24 * VENTANA_MS).toISOString());
  return null;
}

/**
 * Crea la cuenta de un cliente nuevo y su ficha («Sin plan»), y deja la
 * sesión abierta.
 *
 * ⚠️ **Una cédula que ya está en el estudio NO se enlaza a la cuenta nueva.**
 * El correo no se verifica (el SMTP gratuito de Supabase solo envía a los
 * miembros del proyecto), así que cualquiera podría escribir la cédula de otra
 * persona y quedarse con su ficha, sus clases y sus datos. A quien ya es
 * cliente se le dice que pida el acceso en recepción, que sí comprueba quién
 * es. Decisión del usuario, 2 oct 2026.
 *
 * La cuenta y la ficha se crean con la clave `service_role`: quien se registra
 * aún no tiene sesión, y RLS no deja a nadie sin sesión crear clientes. Si la
 * ficha falla, se borra la cuenta, para no dejar una cuenta sin ficha.
 */
export async function registrarCliente(d: DatosRegistro): Promise<Resultado> {
  // Robots: el mensaje es genérico a propósito, no les dice qué los delató.
  if (d.trampa) return { ok: false, error: NO_SE_PUDO };
  if (!Number.isFinite(d.msAbierto) || d.msAbierto < MS_MINIMO) return { ok: false, error: NO_SE_PUDO };

  /* Todo es OBLIGATORIO (decisión del usuario, oct 2026): nombre completo,
     documento, fecha de nacimiento, correo, teléfono, dirección, contacto de
     emergencia y, si es menor, su acudiente. Mismas reglas que el formulario
     (`erroresRegistro`): el navegador avisa, pero quien decide es esto. */
  const hoy = hoyEnBogota();
  const ficha: FichaRegistro = {
    ...d,
    identificacion: d.identificacion.trim().toUpperCase(),
    acudiente: {
      nombre: d.acudiente?.nombre ?? "",
      identificacion: (d.acudiente?.identificacion ?? "").trim().toUpperCase(),
      telefono: d.acudiente?.telefono ?? "",
    },
  };
  const errores = erroresRegistro(ficha, hoy);
  const campo = CAMPOS_REGISTRO.find((c) => errores[c]);
  if (campo) return { ok: false, campo, error: errores[campo]! };

  const nombre = nombrePropio(ficha.nombre);
  const correo = ficha.correo.trim().toLowerCase();
  const tipo = ficha.tipoIdentificacion as TipoIdentificacion;
  const identificacion = ficha.identificacion;
  /* El acudiente solo se guarda si es menor según la fecha del SERVIDOR. A un
     adulto se le ignora aunque lo mande: diría que alguien firma por él. */
  const acudiente = esMenorDeEdad(ficha.fechaNacimiento, hoy) === true ? ficha.acudiente : null;

  const admin = crearClienteAdmin();
  if (!admin) {
    return { ok: false, error: "El registro no está disponible en este momento. Escríbenos por WhatsApp y te ayudamos." };
  }

  // Antes de mirar si el documento existe: así tampoco se puede usar el
  // registro para averiguar en bucle quién es cliente del estudio.
  const freno = await frenoDeRegistro(admin);
  if (freno) return { ok: false, error: freno };

  const { data: existente } = await admin
    .from("clientes")
    .select("cuenta_id")
    .eq("tipo_identificacion", tipo)
    .eq("identificacion", identificacion)
    .maybeSingle();
  if (existente) {
    return {
      ok: false,
      campo: "identificacion",
      error: existente.cuenta_id
        ? "Ya tienes cuenta con ese documento. Entra desde «Iniciar sesión»."
        : "Ya eres cliente del estudio. Pide en recepción que te activen el acceso a la web.",
    };
  }

  const creada = await admin.auth.admin.createUser({
    email: correo,
    password: d.contrasena,
    email_confirm: true,
    user_metadata: { nombre },
  });
  if (creada.error || !creada.data.user) {
    if (creada.error?.code === "email_exists") {
      return { ok: false, campo: "correo", error: "Ese correo ya tiene cuenta. Entra desde «Iniciar sesión»." };
    }
    return { ok: false, error: `No se pudo crear la cuenta: ${creada.error?.message}` };
  }

  const cuentaId = creada.data.user.id;
  const insertada = await admin.from("clientes").insert({
    nombre,
    tipo_identificacion: tipo,
    identificacion,
    correo,
    telefono: ficha.telefono,
    fecha_nacimiento: ficha.fechaNacimiento,
    direccion: ficha.direccion.trim().replace(/\s+/g, " "),
    emergencia_nombre: nombrePropio(ficha.emergenciaNombre),
    emergencia_telefono: ficha.emergenciaTelefono,
    acudiente_nombre: acudiente ? nombrePropio(acudiente.nombre) : null,
    acudiente_identificacion: acudiente?.identificacion ?? null,
    acudiente_telefono: acudiente?.telefono ?? null,
    // Si es menor, quien acepta es el acudiente: queda constancia de quién
    // firmó por él en `acudiente_*` de esta misma fila.
    acepta_terminos: true,
    cuenta_id: cuentaId,
  });
  if (insertada.error) {
    await admin.auth.admin.deleteUser(cuentaId);
    return { ok: false, error: `No se pudo completar el registro: ${insertada.error.message}` };
  }

  // Deja la sesión abierta: quien acaba de registrarse no tiene por qué volver
  // a escribir la contraseña.
  const supabase = await crearClienteServidor();
  await supabase.auth.signInWithPassword({ email: correo, password: d.contrasena });

  revalidatePath("/admin/usuarios");
  return { ok: true };
}

/* ======================================================================
   Reservar y cancelar
   ====================================================================== */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Las reglas (plan vigente el día de la clase, aforo, clase futura, no
 * repetir) las comprueba la FUNCIÓN de la base `reservar_mi_clase`, y sus
 * mensajes ya están escritos para el cliente: aquí solo se traducen a
 * resultado.
 */
export async function reservarClase(claseId: string): Promise<Resultado> {
  if (!UUID.test(claseId)) return { ok: false, error: "Clase no válida." };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("reservar_mi_clase", { p_clase: claseId });
  if (error) return { ok: false, error: error.code === "P0001" ? error.message : "No se pudo reservar. Inténtalo de nuevo." };
  revalidatePath("/mi-cuenta");
  // Recepción ve la reserva en su agenda.
  revalidatePath("/admin/clases");
  return { ok: true };
}

function revalidarReservas() {
  revalidatePath("/mi-cuenta");
  revalidatePath("/admin/clases", "layout");
  revalidatePath("/admin/usuarios", "layout");
}

/** Se apunta a la lista de espera de una clase llena. Devuelve su puesto. */
export async function unirmeListaEspera(claseId: string): Promise<Resultado & { puesto?: number }> {
  if (!UUID.test(claseId)) return { ok: false, error: "Clase no válida." };
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("unirme_lista_espera", { p_clase: claseId });
  if (error) return { ok: false, error: error.code === "P0001" ? error.message : "No se pudo. Inténtalo de nuevo." };
  revalidarReservas();
  return { ok: true, puesto: data };
}

export async function salirListaEspera(claseId: string): Promise<Resultado> {
  if (!UUID.test(claseId)) return { ok: false, error: "Clase no válida." };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("salir_lista_espera", { p_clase: claseId });
  if (error) return { ok: false, error: "No se pudo. Inténtalo de nuevo." };
  revalidarReservas();
  return { ok: true };
}

/**
 * Cambia una reserva por otra clase, de una vez (`reprogramar_mi_reserva`):
 * con el mismo plazo que cancelar, y si la nueva no entra, la original se
 * queda como estaba.
 */
export async function reprogramarReserva(desde: string, hacia: string): Promise<Resultado> {
  if (!UUID.test(desde) || !UUID.test(hacia)) return { ok: false, error: "Clase no válida." };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("reprogramar_mi_reserva", { p_desde: desde, p_hacia: hacia });
  if (error) return { ok: false, error: error.code === "P0001" ? error.message : "No se pudo cambiar. Inténtalo de nuevo." };
  revalidarReservas();
  return { ok: true };
}

/** Dentro del plazo de Configuración (lo comprueba `cancelar_mi_reserva`). */
export async function cancelarReserva(claseId: string): Promise<Resultado> {
  if (!UUID.test(claseId)) return { ok: false, error: "Clase no válida." };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("cancelar_mi_reserva", { p_clase: claseId });
  if (error) return { ok: false, error: error.code === "P0001" ? error.message : "No se pudo cancelar. Inténtalo de nuevo." };
  revalidatePath("/mi-cuenta");
  revalidatePath("/admin/clases");
  return { ok: true };
}
