import { redirect } from "next/navigation";

/**
 * El «Horario semanal» ya no es una pantalla (oct 2026): las clases que se
 * repiten se crean desde la agenda («¿Se repite? Todos los lunes»). Quien
 * tenga guardado el enlace viejo llega a la agenda.
 */
export default function HorarioPage() {
  redirect("/admin/clases");
}
