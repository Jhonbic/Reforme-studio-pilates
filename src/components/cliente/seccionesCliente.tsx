/**
 * Las secciones del área de cliente, en un solo sitio: las pintan la barra
 * lateral y la cabecera (que titula desde la ruta), como `admin/secciones.tsx`
 * en el panel. Sin `"use client"`: solo SVG y datos.
 */

const svg = {
  className: "h-5 w-5 shrink-0",
  fill: "none",
  viewBox: "0 0 24 24",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function IconoInicio() {
  return (
    <svg {...svg}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

/* Reloj, como Clases en el panel: reservar es elegir una hora. */
function IconoReservar() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

/* Calendario, como Planes en el panel: un plan es una vigencia. */
function IconoPlanes() {
  return (
    <svg {...svg}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

function IconoCuenta() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

export type SeccionCliente = { href: string; label: string; icono: () => React.ReactElement };

export const SECCIONES_CLIENTE: SeccionCliente[] = [
  { href: "/mi-cuenta", label: "Inicio", icono: IconoInicio },
  { href: "/mi-cuenta/reservar", label: "Reservar", icono: IconoReservar },
  { href: "/mi-cuenta/planes", label: "Planes", icono: IconoPlanes },
  { href: "/mi-cuenta/configuracion", label: "Mi cuenta", icono: IconoCuenta },
];

/** «Inicio» solo en su ruta exacta; las demás también en sus hijas. */
export function esActivaCliente(href: string, pathname: string): boolean {
  return href === "/mi-cuenta" ? pathname === href : pathname.startsWith(href);
}

export function seccionClienteActual(pathname: string): SeccionCliente {
  return SECCIONES_CLIENTE.find((s) => esActivaCliente(s.href, pathname)) ?? SECCIONES_CLIENTE[0];
}
