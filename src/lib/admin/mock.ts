import type { Notificacion } from "./types";

/**
 * DATOS DE EJEMPLO — no son reales.
 *
 * ⚠️ **Desde oct 2026 aquí solo quedan dos avisos de ejemplo de la campana.**
 * Todo lo demás —clientes, pagos, gastos, planes, cifras del dashboard, el
 * equipo y la agenda de clases— se lee de Supabase (pasos 3 a 9 del plan), y
 * se borró de este archivo al conectarse: dejarlo habría hecho creer que el
 * panel aún lo usaba. También se fue el `HOY` congelado en `2026-07-25`: el
 * «hoy» del panel es `hoyEnBogota()`.
 *
 * Cuando exista un sistema de avisos, este archivo desaparece.
 */

/**
 * Avisos de ejemplo de la campana.
 *
 * ⚠️ **No hay ningún sistema de notificaciones detrás**: son maqueta para
 * decidir cómo se ven. Cuando lo haya, esto lo sustituye una consulta y
 * `getNotificaciones()` no cambia de forma.
 *
 * El primero de la lista **no está aquí**: lo compone `getNotificaciones()` a
 * partir de las membresías por vencer de la base, para que no pueda decir «5
 * vencen» mientras el dashboard dice otra cosa.
 */
export const NOTIFICACIONES: Notificacion[] = [
  {
    id: "n2",
    tipo: "ok",
    titulo: "Laura Gutiérrez renovó su plan",
    detalle: "Trimestral · $510.000 · pago por Nequi",
    cuando: "hace 3 h",
    leida: false,
    href: "/admin/usuarios",
  },
  {
    id: "n3",
    tipo: "info",
    titulo: "2 clientes nuevos esta semana",
    detalle: "Diego Villamil y Esteban Escobar",
    cuando: "ayer",
    leida: true,
    href: "/admin/usuarios",
  },
];
