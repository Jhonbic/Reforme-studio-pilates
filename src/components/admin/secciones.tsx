import type { RolEquipo } from "@/lib/admin/types";
/**
 * Las secciones del panel, en un solo sitio.
 *
 * Vivían dentro de `AdminNav`, pero la topbar necesita el mismo listado para
 * saber en qué sección está y titular la página. Un único origen evita que el
 * nombre del menú y el título se desincronicen.
 *
 * No lleva `"use client"`: son funciones que devuelven SVG puro, así que valen
 * igual desde componentes de servidor y de cliente.
 */

const svg = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className: "h-5 w-5 shrink-0",
};

function IconoDashboard() {
  return (
    <svg {...svg}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function IconoUsuarios() {
  return (
    <svg {...svg}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 5.9M18 14.8c2 .7 3 2.5 3 5.2" />
    </svg>
  );
}

/* ⚠️ Un RELOJ y no un calendario, aunque la agenda vaya por días: el calendario
   ya es el icono de Planes (por la vigencia de la membresía). Dos secciones
   vecinas con el mismo dibujo se eligen mal en el menú, y en móvil las pastillas
   se leen de reojo. Lo que distingue a Clases es la hora. */
function IconoClases() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}

function IconoPlanes() {
  return (
    <svg {...svg}>
      <rect x="3" y="6" width="18" height="14" rx="2.5" />
      <path d="M3 11h18M8 3v4M16 3v4" />
    </svg>
  );
}

function IconoFinanzas() {
  return (
    <svg {...svg}>
      <path d="M4 19V9M10 19V5M16 19v-6M22 19H2" />
    </svg>
  );
}

/* Tendencia y no barras: las barras ya son el icono de Finanzas, la sección
   vecina (la demo hace lo mismo con «Resumen»). */
function IconoEstadisticas() {
  return (
    <svg {...svg}>
      <path d="M3 17l5.5-5.5 4 4L21 7" />
      <path d="M15 7h6v6" />
    </svg>
  );
}

/* Engranaje: lo universal para «ajustes». La última del menú: se toca poco. */
function IconoConfiguracion() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

/* Campana: lo universal para «avisos». */
function IconoActividad() {
  return (
    <svg {...svg}>
      <path d="M6 9a6 6 0 1 1 12 0c0 4.5 1.8 6.5 2.5 7.2a.5.5 0 0 1-.36.8H3.86a.5.5 0 0 1-.36-.8C4.2 15.5 6 13.5 6 9z" />
      <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
    </svg>
  );
}

export type Seccion = {
  href: string;
  label: string;
  icono: () => React.ReactElement;
  /** Roles que NO la ven en el menú (y a los que la página devuelve al panel). */
  ocultaA?: RolEquipo[];
};

/* El orden es el del día de trabajo, no el alfabético: Clases va detrás de
   Usuarios porque las dos son la operación diaria del estudio (quién viene, qué
   se da), mientras Planes y Finanzas se miran de vez en cuando. */
export const SECCIONES: Seccion[] = [
  // La instructora tampoco ve el Dashboard ni Usuarios (decisión del usuario,
  // nov 2026): son fichas y cifras de clientes. Entra directa a Clases, y la
  // base tampoco le da las fichas (migración 20261115120000).
  { href: "/admin", label: "Dashboard", icono: IconoDashboard, ocultaA: ["Instructora"] },
  { href: "/admin/usuarios", label: "Usuarios", icono: IconoUsuarios, ocultaA: ["Instructora"] },
  { href: "/admin/clases", label: "Clases", icono: IconoClases },
  // La instructora no ve dinero ni catálogo (decisión del usuario, oct 2026):
  // su trabajo es la agenda y sus clientes.
  { href: "/admin/planes", label: "Planes", icono: IconoPlanes, ocultaA: ["Instructora"] },
  { href: "/admin/finanzas", label: "Finanzas", icono: IconoFinanzas, ocultaA: ["Instructora"] },
  // Después de Finanzas, como en la demo: se mira de vez en cuando.
  { href: "/admin/estadisticas", label: "Estadísticas", icono: IconoEstadisticas, ocultaA: ["Instructora"] },
  { href: "/admin/configuracion", label: "Configuración", icono: IconoConfiguracion },
];

/**
 * Actividad de reservas (nov 2026): quién reserva, cancela o cambia.
 *
 * ⚠️ **Fuera de `SECCIONES` a propósito**: no es una pastilla más del menú
 * sino la CAMPANA que va bajo la cuenta, con el número de avisos sin ver
 * (decisión del usuario). Aquí está para que la topbar la titule y
 * `seccionActual` no la confunda con el Dashboard (que la instructora no ve,
 * y la devolvería a Clases). La ven todos los roles: a la instructora RLS
 * solo le da lo de sus clases.
 */
export const ACTIVIDAD: Seccion = {
  href: "/admin/actividad",
  label: "Actividad",
  icono: IconoActividad,
};

/** Las secciones que ve un rol, en el orden del menú. */
export function seccionesDe(rol: string | undefined): Seccion[] {
  return SECCIONES.filter((s) => !rol || !s.ocultaA?.includes(rol as RolEquipo));
}

/** La primera pantalla de un rol: la primera sección de su menú. */
export function inicioDe(rol: string | undefined): string {
  return seccionesDe(rol)[0]?.href ?? "/admin";
}

/** Si un rol puede abrir una ruta del panel (por la sección a la que pertenece). */
export function puedeVer(rol: string | undefined, pathname: string): boolean {
  return !seccionActual(pathname).ocultaA?.includes(rol as RolEquipo);
}

/**
 * Rutas hijas con título propio.
 *
 * ⚠️ **Fuera de `SECCIONES` a propósito**: no son entradas de menú, y meterlas
 * ahí pintaría una quinta pastilla en la navegación. Van aparte para que
 * `esSeccionActiva` siga marcando la sección padre —`/admin/usuarios/nuevo`
 * resalta «Usuarios»— y solo cambie el título.
 */
export type Subseccion = { label: string; volverA: string; volverLabel: string };

export const SUBSECCIONES: Record<string, Subseccion> = {
  "/admin/usuarios/nuevo": {
    label: "Nuevo cliente",
    volverA: "/admin/usuarios",
    volverLabel: "Usuarios",
  },
};

/** `/admin/usuarios/<id>`: un segmento más, sin barras dentro. */
const RUTA_FICHA = /^\/admin\/usuarios\/([^/]+)$/;
/** `/admin/usuarios/<id>/editar`. */
const RUTA_EDITAR = /^\/admin\/usuarios\/([^/]+)\/editar$/;

/**
 * La subsección de una ruta, si la tiene.
 *
 * ⚠️ No basta con mirar `SUBSECCIONES[pathname]`: la ficha de cliente lleva un
 * id en la ruta, así que nunca coincidiría con una clave fija. Las rutas con
 * parámetro se reconocen por patrón.
 *
 * ⚠️ El patrón excluye `nuevo` explícitamente. En el enrutador de Next el
 * segmento estático gana al dinámico, así que `/admin/usuarios/nuevo` ya va a
 * su página; pero aquí las dos reglas se evalúan sobre el mismo texto, y sin la
 * exclusión el alta se titularía «Ficha del cliente». Por eso el mapa fijo se
 * consulta primero: es el que manda.
 */
export function subseccionDe(pathname: string): Subseccion | undefined {
  const exacta = SUBSECCIONES[pathname];
  if (exacta) return exacta;

  const editar = RUTA_EDITAR.exec(pathname);
  if (editar) {
    // «← Ficha»: se vuelve a la persona, no al listado.
    return {
      label: "Editar datos",
      volverA: `/admin/usuarios/${editar[1]}`,
      volverLabel: "Ficha del cliente",
    };
  }

  if (RUTA_FICHA.test(pathname)) {
    return {
      /* El nombre de la persona NO se puede poner aquí: la topbar solo conoce
         la ruta, y el id no es el nombre. El nombre lo pone la propia ficha,
         que sí tiene el dato. */
      label: "Ficha del cliente",
      volverA: "/admin/usuarios",
      volverLabel: "Usuarios",
    };
  }

  return undefined;
}

/** `/admin` exacto; el resto por prefijo, para que las subrutas futuras marquen. */
export function esSeccionActiva(href: string, pathname: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function seccionActual(pathname: string): Seccion {
  return (
    [...SECCIONES, ACTIVIDAD]
      .reverse()
      .find((s) => esSeccionActiva(s.href, pathname)) ?? SECCIONES[0]
  );
}
