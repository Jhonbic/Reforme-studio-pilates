"use client";

import { useState, useTransition } from "react";
import Card from "@/components/admin/Card";
import CardHeader from "@/components/admin/CardHeader";
import CampoSelect from "@/components/admin/campos/CampoSelect";
import CampoTexto from "@/components/admin/campos/CampoTexto";
import { useToast } from "@/context/ToastContext";
import { abrirDia, cerrarDia, guardarAforoSala, guardarAjustes, guardarMeta } from "@/lib/admin/acciones";
import { numero } from "@/lib/admin/format";
import { diaLargo, diaRelativo } from "@/lib/admin/horario";
import type { Configuracion, Sala } from "@/lib/admin/types";
import { soloDigitos } from "@/lib/validacion";

const BOTON_PRIMARIO =
  "inline-flex min-h-[44px] items-center justify-center rounded-full bg-dorado px-5 text-sm font-medium text-verde-900 transition-colors duration-300 hover:bg-dorado-dark disabled:cursor-not-allowed disabled:opacity-50";
const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center justify-center overflow-hidden rounded-full border border-verde/40 px-4 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde disabled:opacity-60";

/** «sábado, 17 de octubre» → «Sábado, 17 de octubre» (para empezar una frase). */
const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const HORAS = [0, 1, 2, 3, 4, 6, 12, 24, 48];
/** Campo + «Guardar» en una fila. */
const FILA = "mt-4 flex items-end gap-3";

/**
 * Configuración del estudio: lo que se cambia sin el desarrollador.
 *
 * Cada bloque guarda por separado y dice en un aviso qué pasó, porque casi
 * todo tiene efecto en la agenda (alargarla, bajar un aforo, cerrar un día).
 * Las reglas las aplica la base: aquí solo se eligen los valores.
 */
export default function PanelConfiguracion({ config, hoy }: { config: Configuracion; hoy: string }) {
  return (
    // Reservas y Meta, cortas, emparejadas; Salas a lo ancho con sus dos salas
    // lado a lado, y Días cerrados, que es una lista que crece, debajo.
    // ⚠️ Se probó Salas como tercera columna en `xl`: con dos filas era más
    // alta y estiraba a las otras dos, que quedaban medio vacías.
    <div className="grid gap-4 md:grid-cols-2">
      <AgendaYReservas config={config} />
      <MetaClientes meta={config.metaClientes} />
      <Salas salas={config.salas} />
      <DiasCerrados config={config} hoy={hoy} />
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

/**
 * ⚠️ Ya no tiene «semanas de agenda por delante» (oct 2026): las clases que se
 * repiten tienen fecha de fin y se crean enteras al programarlas, así que ese
 * número no cambiaba nada que se viera. La columna sigue en `ajustes` (solo la
 * usan las franjas antiguas sin fin) y se guarda tal como está.
 */
function AgendaYReservas({ config }: { config: Configuracion }) {
  const [horas, setHoras] = useState(config.horasParaCancelar);
  const { enCurso, guardar } = useGuardar();
  const cambiado = horas !== config.horasParaCancelar;

  return (
    <Card>
      <CardHeader titulo="Reservas" />
      <div className={FILA}>
        <div className="min-w-0 flex-1">
          <CampoSelect
            nombre="horas"
            etiqueta="Cancelar desde la web hasta"
            value={String(horas)}
            onChange={(e) => setHoras(Number(e.target.value))}
            ancho
          >
            {HORAS.map((n) => (
              <option key={n} value={n}>
                {n === 0 ? "Hasta que empiece" : `${n} ${n === 1 ? "hora" : "horas"} antes`}
              </option>
            ))}
          </CampoSelect>
        </div>
        <button
          type="button"
          disabled={!cambiado || enCurso}
          onClick={() => guardar(() => guardarAjustes(config.semanasPorDelante, horas), "Ajustes guardados.")}
          className={BOTON_PRIMARIO}
        >
          {enCurso ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </Card>
  );
}

/** La meta de clientes activos que enseña el dashboard. */
function MetaClientes({ meta }: { meta: number }) {
  const [texto, setTexto] = useState(String(meta));
  const { enCurso, guardar } = useGuardar();
  const valor = Number(texto || 0);
  const valida = valor >= 1 && valor <= 10000;

  return (
    <Card>
      <CardHeader titulo="Meta de clientes" />
      <div className={FILA}>
        <div className="min-w-0 flex-1">
          <CampoTexto
            nombre="meta-clientes"
            etiqueta="Clientes activos"
            inputMode="numeric"
            autoComplete="off"
            value={texto}
            onChange={(e) => setTexto(soloDigitos(e.target.value).slice(0, 5))}
            error={texto !== "" && !valida ? "De 1 a 10.000." : undefined}
          />
        </div>
        <button
          type="button"
          disabled={!valida || valor === meta || enCurso}
          onClick={() => guardar(() => guardarMeta(valor), `Meta: ${numero(valor)} clientes.`)}
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
    <Card className="md:col-span-2">
      <CardHeader titulo="Salas" />
      <ul className="mt-4 grid gap-4 md:grid-cols-2">
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
    <li className="flex items-end gap-3">
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
    }, `${fecha ? mayuscula(diaLargo(fecha)) : "El día"} queda cerrado: no habrá clases.`);
  }

  return (
    <Card className="md:col-span-2">
      <CardHeader titulo="Días cerrados" />

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
