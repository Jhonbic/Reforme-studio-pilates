"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { TIPOS_IDENTIFICACION } from "@/lib/admin/catalogos";
import type { TipoIdentificacion } from "@/lib/admin/types";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/server";
import { esCorreo, esMovilCO } from "@/lib/validacion";

export type Resultado = { ok: true } | { ok: false; error: string; campo?: string };

/* ======================================================================
   Registro
   ====================================================================== */

export type DatosRegistro = {
  nombre: string;
  tipoIdentificacion: string;
  identificacion: string;
  correo: string;
  /** Dígitos en crudo, o vacío: el teléfono es opcional. */
  telefono: string;
  contrasena: string;
  aceptaTerminos: boolean;
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

  const nombre = d.nombre.trim();
  const correo = d.correo.trim().toLowerCase();
  const tipo = d.tipoIdentificacion as TipoIdentificacion;
  const identificacion = d.identificacion.trim().toUpperCase();

  if (nombre.length < 3) return { ok: false, campo: "nombre", error: "Escribe tu nombre completo." };
  if (!TIPOS_IDENTIFICACION.includes(tipo)) return { ok: false, campo: "identificacion", error: "Tipo de documento no válido." };
  if (!/^[A-Z0-9]{4,15}$/.test(identificacion)) return { ok: false, campo: "identificacion", error: "Número de documento no válido." };
  if (!esCorreo(correo)) return { ok: false, campo: "correo", error: "Escribe un correo válido." };
  if (d.telefono && !esMovilCO(d.telefono)) return { ok: false, campo: "telefono", error: "Un móvil colombiano son 10 dígitos y empieza por 3." };
  if (d.contrasena.length < 8) return { ok: false, campo: "contrasena", error: "Mínimo 8 caracteres." };
  if (!d.aceptaTerminos) return { ok: false, campo: "terminos", error: "Debes aceptar los términos para continuar." };

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
  const ficha = await admin.from("clientes").insert({
    nombre,
    tipo_identificacion: tipo,
    identificacion,
    correo,
    telefono: d.telefono || null,
    acepta_terminos: true,
    cuenta_id: cuentaId,
  });
  if (ficha.error) {
    await admin.auth.admin.deleteUser(cuentaId);
    return { ok: false, error: `No se pudo completar el registro: ${ficha.error.message}` };
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
