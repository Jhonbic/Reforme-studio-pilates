"use server";

import { redirect } from "next/navigation";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/server";
import { debeCambiarContrasena } from "./temporal";

export type EstadoLogin = {
  error?: string;
  /** Lo escrito, para no vaciar el correo cuando falla la contraseña. */
  correo?: string;
};

/**
 * A dónde volver después de entrar, dentro de la zona que le toca a cada uno.
 *
 * ⚠️ Solo se aceptan rutas de esa zona (`/admin…` para el equipo, `/mi-cuenta…`
 * para los clientes). `?siguiente=` viene en la URL y lo puede escribir
 * cualquiera: aceptar lo que llegue convertiría el login en un trampolín hacia
 * otra web. Por eso tampoco vale `//otra-web.com`, que el navegador lee como
 * dominio.
 */
function destinoSeguro(siguiente: FormDataEntryValue | null, zona: "/admin" | "/mi-cuenta"): string {
  if (typeof siguiente !== "string") return zona;
  if (siguiente !== zona && !siguiente.startsWith(`${zona}/`)) return zona;
  return siguiente;
}

/**
 * Inicio de sesión con correo y contraseña.
 *
 * Es server action y no una llamada desde el navegador porque así la sesión se
 * escribe en cookies desde el servidor, que es donde la leen el proxy y el
 * layout del panel.
 *
 * ⚠️ El mensaje de error es el MISMO para correo desconocido y contraseña mala.
 * Distinguirlos le diría a quien prueba correos al azar cuáles existen.
 */
export async function iniciarSesion(
  _previo: EstadoLogin,
  datos: FormData,
): Promise<EstadoLogin> {
  const correo = String(datos.get("email") ?? "").trim();
  const contrasena = String(datos.get("password") ?? "");

  if (!correo || !contrasena) {
    return { correo, error: "Escribe tu correo y tu contraseña." };
  }

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: contrasena,
  });

  if (error || !data.user) {
    return { correo, error: "El correo o la contraseña no son correctos." };
  }

  // Una sola puerta para equipo y clientes: decide qué es la cuenta, no la URL.
  //   · con perfil → es del equipo → panel;
  //   · con ficha de cliente → área de cliente;
  //   · con ninguna de las dos → una cuenta que no sirve: se cierra la sesión.
  const [{ data: perfil }, { data: ficha }] = await Promise.all([
    supabase.from("perfiles").select("id").eq("id", data.user.id).maybeSingle(),
    supabase.from("clientes").select("id").eq("cuenta_id", data.user.id).maybeSingle(),
  ]);

  if (!perfil && !ficha) {
    await supabase.auth.signOut();
    return {
      correo,
      error:
        "Esta cuenta no está activa. Si eres del equipo, habla con Administración; si eres cliente, pide en recepción que te la activen.",
    };
  }

  // Contraseña temporal: antes de nada, que elija la suya (el proxy lo
  // vuelve a imponer en cualquier ruta del panel o de su cuenta).
  if (debeCambiarContrasena(data.user)) redirect("/cambiar-contrasena");

  // `redirect` lanza: tiene que ir FUERA de cualquier try/catch.
  redirect(destinoSeguro(datos.get("siguiente"), perfil ? "/admin" : "/mi-cuenta"));
}

export type EstadoCambio = { error?: string };

/**
 * Primer inicio con una contraseña temporal: la persona elige la suya.
 *
 * No pide la actual: acaba de entrar con ella, y la sesión solo sirve para
 * esto hasta que la cambie (el proxy no le deja ir a ninguna otra parte).
 *
 * ⚠️ Quitar la marca exige la clave `service_role`, y después hay que
 * **refrescar la sesión**: el proxy lee la marca del JWT de la cookie, y
 * con el viejo la seguiría viendo y la devolvería aquí en bucle.
 */
export async function cambiarContrasenaInicial(
  _previo: EstadoCambio,
  datos: FormData,
): Promise<EstadoCambio> {
  const nueva = String(datos.get("nueva") ?? "");
  const repetida = String(datos.get("repetida") ?? "");
  if (nueva.length < 8) return { error: "La contraseña necesita al menos 8 caracteres." };
  if (nueva !== repetida) return { error: "Las dos contraseñas no coinciden." };

  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const { data: perfil } = await supabase.from("perfiles").select("id").eq("id", data.user.id).maybeSingle();
  const zona = perfil ? "/admin" : "/mi-cuenta";
  // Solo para quien entró con una temporal; el resto cambia la suya en su
  // perfil, donde se pide la actual.
  if (!debeCambiarContrasena(data.user)) redirect(zona);

  const admin = crearClienteAdmin();
  if (!admin) return { error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor." };

  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) {
    if (error.code === "same_password") return { error: "Elige una contraseña distinta de la temporal." };
    return { error: `No se pudo cambiar: ${error.message}` };
  }
  const marca = await admin.auth.admin.updateUserById(data.user.id, {
    app_metadata: { debe_cambiar_contrasena: false },
  });
  if (marca.error) return { error: `No se pudo terminar el cambio: ${marca.error.message}` };
  await supabase.auth.refreshSession();
  redirect(zona);
}

export async function cerrarSesion() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
