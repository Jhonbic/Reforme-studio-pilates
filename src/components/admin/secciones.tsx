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

export type Seccion = {
  href: string;
  label: string;
  icono: () => React.ReactElement;
};

export const SECCIONES: Seccion[] = [
  { href: "/admin", label: "Dashboard", icono: IconoDashboard },
  { href: "/admin/usuarios", label: "Usuarios", icono: IconoUsuarios },
  { href: "/admin/planes", label: "Planes", icono: IconoPlanes },
  { href: "/admin/finanzas", label: "Finanzas", icono: IconoFinanzas },
];

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

/** `/admin` exacto; el resto por prefijo, para que las subrutas futuras marquen. */
export function esSeccionActiva(href: string, pathname: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function seccionActual(pathname: string): Seccion {
  return (
    [...SECCIONES]
      .reverse()
      .find((s) => esSeccionActiva(s.href, pathname)) ?? SECCIONES[0]
  );
}
