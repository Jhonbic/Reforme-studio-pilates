"use server";

import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

export type EstadoLogin = {
  error?: string;
  /** Lo escrito, para no vaciar el correo cuando falla la contraseña. */
  correo?: string;
};

/**
 * A dónde volver después de entrar.
 *
 * ⚠️ Solo se aceptan rutas del panel. `?siguiente=` viene en la URL y lo puede
 * escribir cualquiera: aceptar lo que llegue convertiría el login en un
 * trampolín hacia otra web («entra aquí y te mando a donde yo quiera»). Por
 * eso tampoco vale `//otra-web.com`, que el navegador lee como dominio.
 */
function destinoSeguro(siguiente: FormDataEntryValue | null): string {
  if (typeof siguiente !== "string") return "/admin";
  if (siguiente !== "/admin" && !siguiente.startsWith("/admin/")) return "/admin";
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

  // Con sesión pero sin perfil: es una cuenta, pero no del estudio. Se cierra
  // la sesión en vez de dejarla abierta para nada.
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!perfil) {
    await supabase.auth.signOut();
    return {
      correo,
      error:
        "El área de clientes todavía no está disponible. Si eres del equipo, pide a administración que te dé acceso.",
    };
  }

  // `redirect` lanza: tiene que ir FUERA de cualquier try/catch.
  redirect(destinoSeguro(datos.get("siguiente")));
}

export async function cerrarSesion() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
