"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import ChartCard from "../ChartCard";
import EstadoClaseBadge from "../clases/EstadoClaseBadge";
import GroupedBars from "../charts/GroupedBars";
import LineChart from "../charts/LineChart";
import Variacion from "../Variacion";
import Cifra from "./Cifra";
import ListaTrabajo, { BotonFicha, BotonWhatsApp, FilaTrabajo } from "./ListaTrabajo";
import { numero, porcentaje } from "@/lib/admin/format";
import { diaRelativo } from "@/lib/admin/horario";
import type { EstadoClase } from "@/lib/admin/types";

export type FilaPorVencer = {
  id: string;
  nombre: string;
  plan: string;
  /** «hoy», «mañana», «en 3 días · vie 9 oct». */
  cuando: string;
  urgente: boolean;
  whatsapp: string | null;
};

export type FilaCumpleanos = {
  id: string;
  nombre: string;
  edad: number | null;
  whatsapp: string | null;
};

export type FilaClase = {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tipo: string;
  instructora: string;
  reservas: number;
  cupos: number;
  estado: EstadoClase;
};

type Props = {
  /** «Viernes, 2 de octubre». */
  fechaTexto: string;
  hoy: string;
  clientes: {
    activos: number;
    /** Activos de hoy menos los de hace 30 días. */
    diferencia: number;
    sinPlan: number;
    recuperables: number;
    renovacion: { valor: number | null; variacion: number | null };
    porVencer: FilaPorVencer[];
    cumpleanos: FilaCumpleanos[];
    activosPorMes: { mes: string; anio: number; activos: number }[];
  };
  clases: {
    hoy: { clases: number; reservas: number; cupos: number };
    semana: { clases: number; reservas: number; cupos: number };
    ocupacion30: number | null;
    promedio30: number | null;
    deHoy: FilaClase[];
    llenas: FilaClase[];
    porDia: { dia: string; clases: number; reservas: number; cupos: number }[];
    semanasPorDia: number;
  };
};

const PESTANAS = [
  { id: "clientes", etiqueta: "Clientes", ver: { href: "/admin/usuarios", texto: "Ver clientes →" } },
  { id: "clases", etiqueta: "Clases", ver: { href: "/admin/clases", texto: "Abrir agenda →" } },
] as const;

type Pestana = (typeof PESTANAS)[number]["id"];

const C1 = "var(--color-chart-1)";

const PASTILLA = "rounded-full border border-beige bg-arena px-3 py-1 text-xs text-verde-700";

/**
 * Dashboard con la organización de JainSportBox (decisión del usuario, oct
 * 2026): fecha → dos pestañas → cuatro cifras iguales → dos listas de trabajo
 * → una gráfica de tendencia. Solo la organización: el aspecto es el de la
 * marca, como ya se hizo en Finanzas.
 *
 * ⚠️ **Dos pestañas y solo dos, Clientes y Clases.** Lo financiero no vuelve
 * aquí: vive entero en Finanzas, con su selector de periodo. Era la mitad de
 * la rejilla anterior y lo que la hacía pesada.
 *
 * Las pestañas son estado de cliente: todo viaja ya calculado y cambiar de
 * una a otra es instantáneo.
 */
export default function PanelDashboard({ fechaTexto, hoy, clientes, clases }: Props) {
  const [pestana, setPestana] = useState<Pestana>("clientes");
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const actual = PESTANAS.find((p) => p.id === pestana) ?? PESTANAS[0];

  function irA(i: number) {
    const n = (i + PESTANAS.length) % PESTANAS.length;
    setPestana(PESTANAS[n].id);
    refs.current[n]?.focus();
  }

  return (
    <div>
      <p className="eyebrow text-dorado-dark">{fechaTexto}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Resumen del estudio" className="flex gap-2">
          {PESTANAS.map((p, i) => {
            const activa = p.id === pestana;
            return (
              /* Mismas pestañas que Usuarios: borde siempre en la inactiva
                 (sin él no se lee como control) y dorado en la activa, el
                 mismo «seleccionado» de todo el panel. */
              <button
                key={p.id}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                role="tab"
                type="button"
                id={`pestana-${p.id}`}
                aria-selected={activa}
                aria-controls="panel-resumen"
                tabIndex={activa ? 0 : -1}
                onClick={() => setPestana(p.id)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") irA(i + 1);
                  if (e.key === "ArrowLeft") irA(i - 1);
                }}
                className={`control-fx relative min-h-[44px] overflow-hidden rounded-full border px-5 text-sm font-bold transition-[color,background-color,border-color,box-shadow] duration-300 ${
                  activa
                    ? "border-dorado bg-dorado text-verde-900"
                    : "border-beige text-verde-700 hover:border-dorado hover:text-verde hover:ring-2 hover:ring-dorado/25 focus-visible:border-dorado focus-visible:ring-2 focus-visible:ring-dorado/25"
                }`}
              >
                {!activa && <span className="control-sheen control-sheen--lento" aria-hidden="true" />}
                {p.etiqueta}
              </button>
            );
          })}
        </div>
        <Link
          href={actual.ver.href}
          className="ml-auto inline-flex min-h-[44px] items-center text-sm text-dorado-dark underline-offset-4 transition-colors duration-300 hover:text-verde hover:underline"
        >
          {actual.ver.texto}
        </Link>
      </div>

      <div
        id="panel-resumen"
        role="tabpanel"
        aria-labelledby={`pestana-${pestana}`}
        className="mt-6 space-y-4 xl:space-y-5"
      >
        {pestana === "clientes" ? (
          <PestanaClientes datos={clientes} />
        ) : (
          <PestanaClases datos={clases} hoy={hoy} />
        )}
      </div>
    </div>
  );
}

function Rejilla4({ children, etiqueta }: { children: React.ReactNode; etiqueta: string }) {
  return (
    <section aria-label={etiqueta} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:gap-5">
      {children}
    </section>
  );
}

function Rejilla2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:gap-5">{children}</div>;
}

function PestanaClientes({ datos }: { datos: Props["clientes"] }) {
  const { diferencia, renovacion } = datos;
  return (
    <>
      <Rejilla4 etiqueta="Cifras de clientes">
        <Cifra
          etiqueta="Activos"
          valor={numero(datos.activos)}
          href="/admin/usuarios"
          /* En NÚMERO de clientes y no en %: con veinte clientes, «+5 %» es
             una persona y se lee como mucho más. */
          detalle={
            diferencia === 0
              ? "Igual que hace 30 días"
              : `${diferencia > 0 ? "+" : "−"}${numero(Math.abs(diferencia))} frente a hace 30 días`
          }
        />
        <Cifra
          etiqueta="Sin plan"
          valor={numero(datos.sinPlan)}
          href={`/admin/usuarios?estado=${encodeURIComponent("Sin plan")}`}
          detalle="Registrados que aún no pagan"
        />
        <Cifra
          etiqueta="Recuperables"
          valor={numero(datos.recuperables)}
          href="/admin/usuarios?estado=Vencida"
          detalle="Vencieron hace menos de 30 días"
        />
        <Cifra
          etiqueta="Renovación"
          /* Sin vencimientos en la ventana no es «0 %» (nadie renovó): es que
             la pregunta no aplica. */
          valor={renovacion.valor === null ? "—" : porcentaje(renovacion.valor, 0)}
          detalle={
            renovacion.valor === null ? (
              "Nadie venció en 30 días"
            ) : (
              <span className="flex flex-wrap items-center gap-x-1.5">
                {/* En PUNTOS: de 60 % a 70 % son 10 puntos, no «+16,7 %». */}
                <Variacion valor={renovacion.variacion} />
                de las que vencieron en 30 días
              </span>
            )
          }
        />
      </Rejilla4>

      <Rejilla2>
        <ListaTrabajo
          titulo="Por vencer · 7 días"
          cuantos={datos.porVencer.length}
          vacio="Nadie vence esta semana"
        >
          {datos.porVencer.map((c) => (
            <FilaTrabajo
              key={c.id}
              titulo={c.nombre}
              detalle={
                <>
                  {c.plan && <>{c.plan} · </>}
                  {/* Hoy y mañana en rojo: es lo que no puede esperar. El texto
                      ya lo dice, el color solo lo subraya. */}
                  <span className={c.urgente ? "font-bold text-[var(--color-estado-grave)]" : undefined}>
                    vence {c.cuando}
                  </span>
                </>
              }
              acciones={
                <>
                  <BotonWhatsApp
                    href={c.whatsapp}
                    texto="Recordar"
                    etiqueta={`Recordar a ${c.nombre} por WhatsApp`}
                  />
                  <BotonFicha href={`/admin/usuarios/${c.id}`} etiqueta={`Ver la ficha de ${c.nombre}`} />
                </>
              }
            />
          ))}
        </ListaTrabajo>

        <ListaTrabajo
          titulo="Cumpleaños de hoy"
          cuantos={datos.cumpleanos.length}
          vacio="Hoy nadie cumple años"
        >
          {datos.cumpleanos.map((c) => (
            <FilaTrabajo
              key={c.id}
              titulo={c.nombre}
              detalle={c.edad === null ? "Cumple años hoy" : `Cumple ${c.edad} años`}
              acciones={
                <>
                  <BotonWhatsApp
                    href={c.whatsapp}
                    texto="Felicitar"
                    etiqueta={`Felicitar a ${c.nombre} por WhatsApp`}
                  />
                  <BotonFicha href={`/admin/usuarios/${c.id}`} etiqueta={`Ver la ficha de ${c.nombre}`} />
                </>
              }
            />
          ))}
        </ListaTrabajo>
      </Rejilla2>

      <ChartCard
        titulo="Clientes activos por mes"
        accion={<span className={PASTILLA}>Últimos 12 meses</span>}
        tabla={{
          cabeceras: ["Mes", "Clientes activos"],
          filas: datos.activosPorMes.map((m) => [`${m.mes} ${m.anio}`, numero(m.activos)]),
        }}
      >
        <LineChart
          datos={datos.activosPorMes.map((m) => ({ label: m.mes, value: m.activos }))}
          formato="clientes"
          serie="Clientes activos"
          formatoEje="numero"
        />
      </ChartCard>
    </>
  );
}

function PestanaClases({ datos, hoy }: { datos: Props["clases"]; hoy: string }) {
  const { semana } = datos;
  return (
    <>
      <Rejilla4 etiqueta="Cifras de clases">
        <Cifra
          etiqueta="Hoy"
          valor={numero(datos.hoy.clases)}
          href="/admin/clases"
          detalle={
            datos.hoy.clases === 0
              ? "Sin clases programadas"
              : `${numero(datos.hoy.reservas)} de ${numero(datos.hoy.cupos)} cupos reservados`
          }
        />
        <Cifra
          etiqueta="Esta semana"
          valor={numero(semana.reservas)}
          detalle={
            semana.clases === 0
              ? "Sin clases programadas"
              : `reservas de ${numero(semana.cupos)} cupos · ${numero(semana.clases)} clases`
          }
        />
        <Cifra
          etiqueta="Ocupación"
          valor={datos.ocupacion30 === null ? "—" : porcentaje(datos.ocupacion30, 0)}
          detalle="Clases de los últimos 30 días"
        />
        <Cifra
          etiqueta="Por clase"
          valor={
            datos.promedio30 === null
              ? "—"
              : datos.promedio30.toLocaleString("es-CO", { maximumFractionDigits: 1 })
          }
          detalle="Reservas de media, 30 días"
        />
      </Rejilla4>

      <Rejilla2>
        <ListaTrabajo titulo="Clases de hoy" cuantos={datos.deHoy.length} vacio="Hoy no hay clases">
          {datos.deHoy.map((c) => (
            <FilaClaseResumen key={c.id} clase={c} />
          ))}
        </ListaTrabajo>

        <ListaTrabajo
          titulo="Llenas · próximos 7 días"
          cuantos={datos.llenas.length}
          vacio="Ninguna clase está llena"
        >
          {datos.llenas.map((c) => (
            <FilaClaseResumen key={c.id} clase={c} dia={mayuscula(diaRelativo(c.fecha, hoy))} />
          ))}
        </ListaTrabajo>
      </Rejilla2>

      {/* ⚠️ Son RESERVAS, no asistencias: aún no existe el registro de quién
          vino. Esta es la tarjeta donde entrará la asistencia como segunda
          serie. Solo clases ya pasadas y no canceladas. */}
      <ChartCard
        titulo="Reservas por día de la semana"
        accion={<span className={PASTILLA}>Últimas {datos.semanasPorDia} semanas</span>}
        tabla={{
          cabeceras: ["Día", "Clases", "Reservas", "Cupos", "Ocupación"],
          filas: datos.porDia.map((d) => [
            d.dia,
            numero(d.clases),
            numero(d.reservas),
            numero(d.cupos),
            d.cupos ? porcentaje((d.reservas / d.cupos) * 100, 0) : "—",
          ]),
        }}
      >
        <GroupedBars
          datos={datos.porDia.map((d) => ({ label: d.dia, valores: [d.reservas] }))}
          series={[{ nombre: "Reservas", color: C1 }]}
          categoria="día de la semana"
          formato="numero"
          formatoEje="numero"
        />
      </ChartCard>
    </>
  );
}

/** «lunes, 5 de octubre» → «Lunes, 5 de octubre», para que case con «Mañana». */
const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Solo se pinta la pastilla cuando dice algo: «Programada» es lo normal. */
function FilaClaseResumen({ clase: c, dia }: { clase: FilaClase; dia?: string }) {
  return (
    <FilaTrabajo
      titulo={
        <>
          <span className="font-cifra font-normal">
            {dia ? `${dia} · ` : ""}
            {c.horaInicio}–{c.horaFin}
          </span>{" "}
          · {c.tipo}
        </>
      }
      detalle={`${c.instructora} · ${numero(c.reservas)} / ${numero(c.cupos)} reservas`}
      acciones={c.estado !== "Programada" ? <EstadoClaseBadge estado={c.estado} /> : undefined}
    />
  );
}
