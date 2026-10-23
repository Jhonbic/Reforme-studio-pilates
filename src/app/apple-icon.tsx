import { iconoMarca } from "@/lib/marca/iconoMarca";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** El icono al guardar la web en la pantalla de inicio del iPhone (iOS pone
 *  sus propias esquinas redondeadas: aquí va cuadrado). */
export default function AppleIcon() {
  return iconoMarca(180, 0);
}
