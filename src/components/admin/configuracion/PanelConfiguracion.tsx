"use client";

import { useState, useTransition } from "react";
import Card from "@/components/admin/Card";
import CardHeader from "@/components/admin/CardHeader";
import CampoSelect from "@/components/admin/campos/CampoSelect";
import CampoTexto from "@/components/admin/campos/CampoTexto";
import { useToast } from "@/context/ToastContext";
import { abrirDia, cerrarDia, guardarAforoSala, guardarAjustes } from "@/lib/admin/acciones";
import { METODOS_PAGO } from "@/lib/admin/catalogos";
import { numero } from "@/lib/admin/format";
import { diaLargo, diaRelativo } from "@/lib/admin/horario";
import type { Configuracion, Sala } from "@/lib/admin/types";

const BOTON_PRIMARIO =
  "inline-flex min-h-[44px] items-center justify-center rounded-full bg-dorado px-5 text-sm font-medium text-verde-900 transition-colors duration-300 hover:bg-dorado-dark disabled:cursor-not-allowed disabled:opacity-50";
const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center justify-center overflow-hidden rounded-full border border-verde/40 px-4 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde disabled:opacity-60";

const SEMANAS = [1, 2, 3, 4, 6, 8, 12];

/** «sábado, 17 de octubre» → «Sábado, 17 de octubre» (para empezar una frase). */
const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const HORAS = [0, 1, 2, 3, 4, 6, 12, 24, 48];

/**
 * Configuración del estudio: lo que se cambia sin el desarrollador.
 *
 * Cada bloque guarda por separado y dice en un aviso qué pasó, porque casi
 * todo tiene efecto en la agenda (alargarla, bajar un aforo, cerrar un día).
 * Las reglas las aplica la base: aquí solo se eligen los valores.
 */
export default function PanelConfiguracion({ config, hoy }: { config: Configuracion; hoy: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <AgendaYReservas config={config} />
      <Salas salas={config.salas} />
      <DiasCerrados config={config} hoy={hoy} />
      <Card>
        <CardHeader titulo="Formas de pago" />
        <p className="mt-2 text-sm text-verde-700">
          Las que se pueden elegir al cobrar un plan y al registrar un gasto:
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {METODOS_PAGO.map((m) => (
            <li key={m} className="rounded-full border border-beige px-3 py-1 text-sm text-verde-700">
              {m}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-verde-300">
          Para añadir otra, pídela: queda guardada en cada pago y en los informes.
        </p>
      </Card>
    </div>
  );
}

function useGuardar() {
  const { mostrarAviso } = useToast();
  const [enCurso, iniciar] = useTransition();
  function guardar(
    accion: () => Promise<{ ok: true; aviso?: string } | { ok: false; error: string }>,
    exito: string,
  ) {
    iniciar(async () => {
      const r = await accion();
      if (!r.ok) return mostrarAviso(r.error, "error");
      mostrarAviso(r.aviso ? `${exito} ${r.aviso}` : exito, r.aviso ? "warning" : "success");
    });
  }
  return { enCurso, guardar };
}

function AgendaYReservas({ config }: { config: Configuracion }) {
  const [semanas, setSemanas] = useState(config.semanasPorDelante);
  const [horas, setHoras] = useState(config.horasParaCancelar);
  const { enCurso, guardar } = useGuardar();
  const cambiado = semanas !== config.semanasPorDelante || horas !== config.horasParaCancelar;

  return (
    <Card>
      <CardHeader titulo="Agenda y reservas" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <CampoSelect
          nombre="semanas"
          etiqueta="Agenda creada por delante"
          value={String(semanas)}
          onChange={(e) => setSemanas(Number(e.target.value))}
          ayuda="Las clases del horario semanal ya están en la agenda para este tiempo. Se puede reservar hasta ahí."
        >
          {SEMANAS.map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "semana" : "semanas"}
            </option>
          ))}
        </CampoSelect>
        <CampoSelect
          nombre="horas"
          etiqueta="Cancelar desde la web hasta"
          value={String(horas)}
          onChange={(e) => setHoras(Number(e.target.value))}
          ayuda="Antes de que empiece la clase. Cancelar a tiempo devuelve la clase al plan; después, se habla con recepción."
        >
          {HORAS.map((n) => (
            <option key={n} value={n}>
              {n === 0 ? "Hasta que empiece" : `${n} ${n === 1 ? "hora" : "horas"} antes`}
            </option>
          ))}
        </CampoSelect>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={!cambiado || enCurso}
          onClick={() => guardar(() => guardarAjustes(semanas, horas), "Ajustes guardados.")}
          className={BOTON_PRIMARIO}
        >
          {enCurso ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </Card>
  );
}

function Salas({ salas }: { salas: Sala[] }) {
  return (
    <Card>
      <CardHeader titulo="Salas" />
      <p className="mt-2 text-sm text-verde-700">
        Cuántas personas caben en cada una. Ninguna clase puede tener más cupos que su sala, y al
        cambiarlo cambian las próximas clases de esa sala.
      </p>
      <ul className="mt-4 space-y-3">
        {salas.map((s) => (
          <FilaSala key={s.id} sala={s} />
        ))}
      </ul>
    </Card>
  );
}

function FilaSala({ sala }: { sala: Sala }) {
  const [capacidad, setCapacidad] = useState(sala.capacidad);
  const { enCurso, guardar } = useGuardar();
  const opciones = Array.from({ length: Math.max(20, sala.capacidad) }, (_, i) => i + 1);
  return (
    <li className="flex flex-wrap items-end gap-3 rounded-xl border border-beige p-3">
      <div className="min-w-0 flex-1">
        <CampoSelect
          nombre={`capacidad-${sala.id}`}
          etiqueta={sala.nombre}
          value={String(capacidad)}
          onChange={(e) => setCapacidad(Number(e.target.value))}
          ancho
        >
          {opciones.map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "persona" : "personas"}
            </option>
          ))}
        </CampoSelect>
      </div>
      <button
        type="button"
        disabled={capacidad === sala.capacidad || enCurso}
        onClick={() =>
          guardar(() => guardarAforoSala(sala.id, capacidad), `${sala.nombre}: ${numero(capacidad)} personas.`)
        }
        className={BOTON_PRIMARIO}
      >
        {enCurso ? "Guardando…" : "Guardar"}
      </button>
    </li>
  );
}

function DiasCerrados({ config, hoy }: { config: Configuracion; hoy: string }) {
  const [fecha, setFecha] = useState("");
  const [motivo, setMotivo] = useState("");
  const { enCurso, guardar } = useGuardar();

  function cerrar(e: React.FormEvent) {
    e.preventDefault();
    guardar(async () => {
      const r = await cerrarDia(fecha, motivo);
      if (r.ok) {
        setFecha("");
        setMotivo("");
      }
      return r;
    }, `${fecha ? mayuscula(diaLargo(fecha)) : "El día"} queda cerrado: no habrá clases del horario.`);
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader titulo="Días cerrados" />
      <p className="mt-2 text-sm text-verde-700">
        Festivos, vacaciones o cualquier día sin clases. La agenda quita las clases de ese día que
        nadie había reservado y no vuelve a crearlas; las que ya tenían reservas se quedan para que
        las canceles y avises.
      </p>

      <form onSubmit={cerrar} noValidate className="mt-4 grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-end">
        <CampoTexto
          nombre="cerrar-fecha"
          etiqueta="Día"
          type="date"
          min={hoy}
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
        />
        <CampoTexto
          nombre="cerrar-motivo"
          etiqueta="Motivo"
          placeholder="Festivo, vacaciones…"
          maxLength={80}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" disabled={!fecha || !motivo.trim() || enCurso} className={BOTON_PRIMARIO}>
          {enCurso ? "Guardando…" : "Cerrar el día"}
        </button>
      </form>

      {config.diasCerrados.length === 0 ? (
        <p className="mt-4 rounded-xl border border-beige bg-arena/50 px-4 py-5 text-center text-sm text-verde-300">
          No hay días cerrados por delante.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-beige rounded-xl border border-beige">
          {config.diasCerrados.map((d) => (
            <li key={d.fecha} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm text-verde first-letter:uppercase">
                  <span className="font-bold">{diaLargo(d.fecha)}</span>
                  <span className="text-verde-300">
                    {/* «Mañana» solo cuando dice algo que la fecha no dice. */}
                    {diaRelativo(d.fecha, hoy) !== diaLargo(d.fecha) && ` · ${diaRelativo(d.fecha, hoy)}`} ·{" "}
                    {d.motivo}
                  </span>
                </p>
                {d.conReservas > 0 && (
                  <p className="text-xs text-[var(--color-estado-aviso)]">
                    ▲ {numero(d.conReservas)} {d.conReservas === 1 ? "clase sigue" : "clases siguen"} ese día
                    porque tenían reservas: cancélalas en la agenda.
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={enCurso}
                onClick={() => guardar(() => abrirDia(d.fecha), `${mayuscula(diaLargo(d.fecha))} vuelve a tener clases.`)}
                className={BOTON}
                aria-label={`Volver a abrir el ${diaLargo(d.fecha)}`}
              >
                <span className="control-sheen" aria-hidden="true" />
                Volver a abrir
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
