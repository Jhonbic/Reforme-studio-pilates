/**
 * ¿Entró con una contraseña temporal? La marca la pone el servidor al crearla
 * (`app_metadata.debe_cambiar_contrasena`, que el usuario no puede tocar) y la
 * quita `cambiarContrasenaInicial` cuando elige la suya.
 *
 * Vale igual para el usuario de Supabase y para los claims del JWT (el proxy
 * la lee de ahí, sin ir a la base).
 */
export function debeCambiarContrasena(u: { app_metadata?: unknown } | null | undefined): boolean {
  const meta = u?.app_metadata as { debe_cambiar_contrasena?: unknown } | undefined;
  return meta?.debe_cambiar_contrasena === true;
}
