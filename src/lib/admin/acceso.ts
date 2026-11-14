import "server-only";
import { redirect } from "next/navigation";
import { inicioDe, puedeVer } from "@/components/admin/secciones";
import { getUsuarioActual } from "./queries";
import type { UsuarioActual } from "./types";

/**
 * La puerta de cada página del panel que algún rol no puede abrir.
 *
 * Esconder la sección del menú no basta: la URL se escribe a mano. Esto va en
 * la PRIMERA línea de la página, antes de pedir ningún dato, y devuelve a ese
 * rol a su pantalla de inicio. Quién ve qué vive en un solo sitio
 * (`ocultaA` en `secciones.tsx`), el mismo que pinta el menú.
 *
 * Es la segunda capa: debajo, RLS no le da los datos aunque llegara a pedirlos.
 * Un test (`secciones.test.ts`) exige esta llamada en toda página de una
 * sección oculta a algún rol.
 */
export async function exigirSeccion(href: string): Promise<UsuarioActual> {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect("/login?error=sin-acceso");
  if (!puedeVer(usuario.rol, href)) redirect(inicioDe(usuario.rol));
  return usuario;
}
