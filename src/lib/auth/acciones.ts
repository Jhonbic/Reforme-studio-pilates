"use server";

import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

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
        "Esta cuenta no tiene acceso. Si eres cliente del estudio, pide en recepción que te lo activen.",
    };
  }

  // `redirect` lanza: tiene que ir FUERA de cualquier try/catch.
  redirect(destinoSeguro(datos.get("siguiente"), perfil ? "/admin" : "/mi-cuenta"));
}

export async function cerrarSesion() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
