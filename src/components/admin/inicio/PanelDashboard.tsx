"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import LineChart from "../charts/LineChart";
import AgendaReservas, { type ClaseDelMes } from "./AgendaReservas";
import { numero } from "@/lib/admin/format";

export type FilaPorVencer = {
  id: string;
  nombre: string;
  /** «Vence hoy», «Vence mañana», «Vence en 3 días». */
  vence: string;
  urgente: boolean;
  whatsapp: string | null;
};

export type FilaCumpleanos = { id: string; nombre: string; whatsapp: string | null };

type Props = {
  /** «Viernes, 2 de octubre de 2026». */
  fechaTexto: string;
  hoy: string;
  clientes: {
    activos: number;
    /** Activos de hoy menos los del cierre del mes pasado; `null` sin mes anterior. */
    deltaActivos: number | null;
    pendientes: number;
    recuperables: number;
    renovacion: { porcentaje: number | null; renovaron: number; vencieron: number };
    porVencer: FilaPorVencer[];
    cumpleanos: FilaCumpleanos[];
    activosPorMes: { mes: string; anio: number; activos: number }[];
  };
  clases: {
    hoy: number;
    semana: number;
    promedioDiario: number | null;
    participacion: number | null;
    personasSemana: number;
    activos: number;
    delMes: ClaseDelMes[];
  };
};

const TABS = [
  { key: "clientes", label: "Clientes", ver: "/admin/usuarios" },
  { key: "clases", label: "Clases", ver: "/admin/clases" },
] as const;

type Tab = (typeof TABS)[number]["key"];

/* Las piezas de JainSportBox, con los colores de Reforme: el rojo de Jain es
   aquí el dorado, el negro el verde de marca, el gris el verde grisáceo. */
const TARJETA = "rounded-2xl border border-beige bg-white p-5 shadow-card";
const ROTULO = "mb-2 text-xs font-bold uppercase tracking-widest text-verde-300";
const CIFRA = "font-cifra text-3xl font-bold text-verde";
const NOTA = "mt-1 text-xs text-verde-300";
const BOTON_VER =
  "rounded-lg border border-beige bg-white px-3 py-1.5 text-xs font-semibold text-verde-700 transition-colors hover:border-dorado";

/**
 * Dashboard, copia de la ORGANIZACIÓN y la FORMA del de JainSportBox
 * (`../JainSportBox/frontend/src/views/DashboardView.vue`) con los colores de
 * Reforme. Decisión del usuario (oct 2026): «como el de Jain, tal cual».
 *
 * Diferencias que son de datos, no de diseño:
 * - La segunda pestaña es **Clases** y cuenta RESERVAS: Jain cuenta entradas
 *   al box y Reforme todavía no registra quién viene.
 * - Sin la pestaña «Enviados» de las listas: Jain guarda a quién ya se le
 *   escribió y Reforme no tiene tabla para eso (decisión del usuario).
 * - Lo financiero no aparece, igual que en Jain: vive en Finanzas.
 */
export default function PanelDashboard({ fechaTexto, clientes, clases, hoy }: Props) {
  const [tab, setTab] = useState<Tab>("clientes");
  const ver = TABS.find((t) => t.key === tab)?.ver ?? "/admin/usuarios";

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight text-verde">Resumen del estudio</h2>
        <p className="mt-1 text-verde-300">{fechaTexto}</p>
      </div>

      {/* Dos pestañas y solo dos. Lo financiero no vuelve aquí: vive entero en
          Finanzas, que tiene su propio selector de periodo. */}
      <div
        role="tablist"
        aria-label="Resumen"
        className="mb-6 flex items-center gap-6 border-b border-beige"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 pb-3 text-xs font-bold uppercase tracking-widest transition-colors ${
              tab === t.key
                ? "border-dorado text-dorado-dark"
                : "border-transparent text-verde-300 hover:text-verde-700"
            }`}
          >
            {t.label}
          </button>
        ))}
        <Link
          href={ver}
          className="ml-auto pb-3 text-xs font-bold text-dorado-dark hover:underline"
        >
          Ver todos →
        </Link>
      </div>

      {tab === "clientes" ? <BloqueClientes d={clientes} /> : <BloqueClases d={clases} hoy={hoy} />}
    </div>
  );
}

// ═══════════ BLOQUE: CLIENTES ═══════════

function BloqueClientes({ d }: { d: Props["clientes"] }) {
  const { deltaActivos: delta, renovacion } = d;
  return (
    <section className="mb-10">
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Activos y Pendientes navegan: la flecha del encabezado los marca como enlace. */}
        <TarjetaEnlace href="/admin/usuarios" rotulo="Activos">
          <p className={CIFRA}>{numero(d.activos)}</p>
          {/* Compara activos contra activos (cierre del mes pasado), no altas:
              puesto debajo de este número, un delta de altas se lee como
              clientes perdidos. */}
          {delta !== null && (
            <p
              className={`mt-1 text-xs ${
                delta > 0
                  ? "text-[var(--color-estado-ok)]"
                  : delta < 0
                    ? "text-[var(--color-estado-grave)]"
                    : "text-verde-300"
              }`}
            >
              {delta === 0
                ? "Igual que el mes pasado"
                : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} del mes pasado`}
            </p>
          )}
        </TarjetaEnlace>

        {/* Sin acento de color aunque haya pendientes: alguien sin plan es
            trabajo normal del día, no una alarma. El número ya lo dice. */}
        <TarjetaEnlace
          href={`/admin/usuarios?estado=${encodeURIComponent("Sin plan")}`}
          rotulo="Pendientes"
        >
          <p className={CIFRA}>{numero(d.pendientes)}</p>
          <p className={NOTA}>{d.pendientes === 1 ? "Cliente sin plan" : "Clientes sin plan"}</p>
        </TarjetaEnlace>

        <div className={TARJETA}>
          <p className={ROTULO}>Recuperables</p>
          <p className={CIFRA}>{numero(d.recuperables)}</p>
          <p className={NOTA}>Vencidos hace menos de 30 días</p>
        </div>

        <div className={TARJETA}>
          <p className={ROTULO}>Renovación</p>
          <p className={CIFRA}>
            {renovacion.porcentaje !== null ? `${Math.round(renovacion.porcentaje)}%` : "—"}
          </p>
          <p className={NOTA}>
            {renovacion.renovaron} de {renovacion.vencieron} · últimos 30 días
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Cumpleaños de hoy */}
        <Lista
          icono={<IconoPastel />}
          titulo="Cumpleaños hoy"
          cuantos={d.cumpleanos.length}
          alto="12.5rem"
          vacio={{ icono: <IconoPersonas />, texto: "No hay clientes por felicitar" }}
        >
          {d.cumpleanos.map((u) => (
            <Fila key={u.id} nombre={u.nombre}>
              {/* Se pregunta por el enlace, no por el teléfono: un número
                  incompleto genera un botón que lleva a un error de WhatsApp. */}
              {u.whatsapp && <BotonWhatsApp href={u.whatsapp} texto="Felicitar" quien={u.nombre} />}
              <Link href={`/admin/usuarios/${u.id}`} className={BOTON_VER}>
                Ver perfil
              </Link>
            </Fila>
          ))}
        </Lista>

        {/* Membresías por vencer: los recordatorios de WhatsApp */}
        <Lista
          titulo="Por vencer · 7 días"
          cuantos={d.porVencer.length}
          alto="14rem"
          vacio={{ icono: <IconoCampana />, texto: "Ninguna membresía vence esta semana" }}
        >
          {d.porVencer.map((a) => (
            <Fila
              key={a.id}
              nombre={a.nombre}
              detalle={
                <p
                  className={`text-xs ${
                    a.urgente ? "font-semibold text-[var(--color-estado-grave)]" : "text-verde-300"
                  }`}
                >
                  {a.vence}
                </p>
              }
            >
              {a.whatsapp ? (
                <BotonWhatsApp href={a.whatsapp} texto="Recordar" quien={a.nombre} icono={false} />
              ) : (
                <span className="rounded-full bg-arena px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-verde-300">
                  Sin teléfono
                </span>
              )}
              <Link href={`/admin/usuarios/${a.id}`} className={BOTON_VER}>
                Ver
              </Link>
            </Fila>
          ))}
        </Lista>
      </div>

      {/* Evolución de clientes activos, al pie del bloque: arriba van las
          tarjetas y las dos listas accionables (hoy), aquí la tendencia. */}
      <div className={`${TARJETA} mt-4`}>
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-verde-300">
            Clientes activos por mes
          </p>
          <p className="mt-1 text-xs text-verde-300">
            Reconstruido a partir de las membresías registradas
          </p>
        </div>
        <LineChart
          datos={d.activosPorMes.map((m) => ({ label: m.mes, value: m.activos }))}
          formato="clientes"
          formatoEje="numero"
          serie="Clientes activos"
        />
        {/* La tabla equivalente, solo para lectores de pantalla: Jain no la
            enseña, pero un gráfico sin texto deja fuera a quien no lo ve.
            ⚠️ El `sr-only` va en un DIV que la envuelve, NO en la `<table>`:
            una tabla no respeta el alto de 1px, y en posición absoluta
            estiraba la página ~300px de vacío por debajo del dashboard. */}
        <div className="sr-only">
          <table>
            <caption>Clientes activos por mes</caption>
            <tbody>
              {d.activosPorMes.map((m) => (
                <tr key={`${m.mes}-${m.anio}`}>
                  <th scope="row">
                    {m.mes} {m.anio}
                  </th>
                  <td>{m.activos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ═══════════ BLOQUE: CLASES ═══════════

function BloqueClases({ d, hoy }: { d: Props["clases"]; hoy: string }) {
  return (
    <section className="mb-6">
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className={TARJETA}>
          <p className={ROTULO}>Hoy</p>
          <p className={CIFRA}>{numero(d.hoy)}</p>
          <p className={NOTA}>Reservas</p>
        </div>
        <div className={TARJETA}>
          <p className={ROTULO}>Esta semana</p>
          <p className={CIFRA}>{numero(d.semana)}</p>
          <p className={NOTA}>Reservas</p>
        </div>
        <div className={TARJETA}>
          <p className={ROTULO}>Promedio diario</p>
          <p className={CIFRA}>{d.promedioDiario === null ? "—" : numero(d.promedioDiario)}</p>
          <p className={NOTA}>Últimos 30 días</p>
        </div>
        <div className={TARJETA}>
          <p className={ROTULO}>Participación</p>
          <p className={CIFRA}>{d.participacion === null ? "—" : `${d.participacion}%`}</p>
          <p className={NOTA}>
            {d.personasSemana} de {d.activos} reservaron esta semana
          </p>
        </div>
      </div>

      {/* Clases por día (en Jain, las sesiones por bloque horario). */}
      <AgendaReservas clases={d.delMes} hoy={hoy} />
    </section>
  );
}

// ═══════════ Piezas ═══════════

function TarjetaEnlace({
  href,
  rotulo,
  children,
}: {
  href: string;
  rotulo: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`group block transition-colors hover:border-dorado ${TARJETA}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-verde-300">{rotulo}</p>
        <svg
          className="h-4 w-4 shrink-0 text-verde-300 transition-all group-hover:translate-x-0.5 group-hover:text-verde"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
          />
        </svg>
      </div>
      {children}
    </Link>
  );
}

function Lista({
  icono,
  titulo,
  cuantos,
  alto,
  vacio,
  children,
}: {
  icono?: ReactNode;
  titulo: string;
  cuantos: number;
  /** Tope de filas visibles (Jain: 4 en cumpleaños, ~5 en vencimientos). */
  alto: string;
  vacio: { icono: ReactNode; texto: string };
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-beige bg-white">
      <div className="flex items-center gap-3 border-b border-beige px-4 py-3">
        {icono}
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-verde">
          {titulo}
          {cuantos > 0 && (
            <span className="flex h-4 items-center rounded-full bg-dorado px-1.5 text-[10px] font-bold text-verde-900">
              {cuantos}
            </span>
          )}
        </h3>
      </div>
      {cuantos === 0 ? (
        /* Vacío: mismo alto que la lista llena, para que la tarjeta no salte. */
        <div
          className="flex flex-col items-center justify-center px-4 text-center"
          style={{ minHeight: alto }}
        >
          {vacio.icono}
          <p className="text-sm font-medium text-verde-300">{vacio.texto}</p>
        </div>
      ) : (
        <div
          className="flex flex-col divide-y divide-beige overflow-y-auto"
          style={{ maxHeight: alto }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function Fila({
  nombre,
  detalle,
  children,
}: {
  nombre: string;
  detalle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-verde">{nombre}</p>
        {detalle}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

function BotonWhatsApp({
  href,
  texto,
  quien,
  icono = true,
}: {
  href: string;
  texto: string;
  quien: string;
  icono?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${texto} a ${quien} por WhatsApp`}
      className="flex items-center gap-1.5 rounded-lg bg-verde px-3 py-1.5 text-xs font-bold text-arena transition-colors hover:bg-verde-700"
    >
      {icono && (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.553 4.116 1.522 5.85L0 24l6.335-1.48A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.371l-.36-.214-3.73.871.938-3.63-.234-.373A9.817 9.817 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z" />
        </svg>
      )}
      {texto}
    </a>
  );
}

function IconoPastel() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-verde-300"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12"
      />
    </svg>
  );
}

function IconoPersonas() {
  return (
    <svg
      className="mb-3 h-10 w-10 text-beige"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function IconoCampana() {
  return (
    <svg
      className="mb-3 h-10 w-10 text-beige"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}
