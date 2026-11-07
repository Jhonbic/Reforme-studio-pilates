"use client";

import { useState, useTransition } from "react";
import Card from "@/components/admin/Card";
import CardHeader from "@/components/admin/CardHeader";
import Modal from "@/components/admin/Modal";
import Pastilla, { TONO_ESTADO } from "@/components/admin/Pastilla";
import CampoTexto from "@/components/admin/campos/CampoTexto";
import CampoCheck from "@/components/admin/campos/CampoCheck";
import { control } from "@/components/admin/campos/estilos";
import { useToast } from "@/context/ToastContext";
import { eliminarCampana, guardarCampana, terminarCampana } from "@/lib/admin/acciones";
import {
  erroresCampana,
  estadoDeCampana,
  frasesTramos,
  MAX_TRAMOS,
  metaDe,
  PORCENTAJES_CAMPANA,
  type BorradorCampana,
  type CampanaConfig,
  type CampoCampana,
  type EstadoDeCampana,
} from "@/lib/admin/campana";
import { fecha, numero } from "@/lib/admin/format";
import { sumarDias } from "@/lib/admin/horario";
import { soloDigitos } from "@/lib/validacion";

const BOTON_PRIMARIO =
  "inline-flex min-h-[44px] items-center justify-center rounded-full bg-dorado px-5 text-sm font-medium text-verde-900 transition-colors duration-300 hover:bg-dorado-dark disabled:cursor-not-allowed disabled:opacity-50";
const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center justify-center overflow-hidden rounded-full border border-verde/40 px-4 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde disabled:opacity-60";

const TONO: Record<EstadoDeCampana, { simbolo: string; clase: string }> = {
  "En curso": { simbolo: "●", clase: TONO_ESTADO.ok },
  Programada: { simbolo: "◇", clase: TONO_ESTADO.aviso },
  Terminada: { simbolo: "○", clase: TONO_ESTADO.neutro },
};

/** Los tramos que pidió el estudio para la apertura: el punto de partida de
 *  una campaña nueva (se cambian en el formulario). */
const TRAMOS_APERTURA = [
  { cupos: 20, pct: 15 },
  { cupos: 25, pct: 10 },
  { cupos: 35, pct: 5 },
];

/** Tramo en el formulario: los cupos como texto, para poder vaciar el campo. */
type TramoEnEdicion = { cupos: string; pct: number };

/** «del 10 al 16 nov» / «del 28 nov al 4 dic». */
function rango(desde: string, hasta: string) {
  if (desde === hasta) return `el ${fecha(desde)}`;
  const [d1, m1] = fecha(desde).split(" ");
  return m1 === fecha(hasta).split(" ")[1] ? `del ${d1} al ${fecha(hasta)}` : `del ${fecha(desde)} al ${fecha(hasta)}`;
}

/**
 * Campañas de descuento por tramos (la apertura): «las primeras 20 al 15 %,
 * las siguientes 25 al 10 %…». Quien cobra es la base (`registrar_membresia`);
 * aquí solo se montan, se terminan o se borran.
 */
export default function CampanasDescuento({ campanas, hoy }: { campanas: CampanaConfig[]; hoy: string }) {
  // `null` = cerrado; `"nueva"` = crear; una campaña = editarla.
  const [editando, setEditando] = useState<CampanaConfig | "nueva" | null>(null);

  return (
    <Card className="md:col-span-2">
      <CardHeader
        titulo="Campaña de descuento"
        accion={
          <button type="button" onClick={() => setEditando("nueva")} className={BOTON}>
            <span className="control-sheen" aria-hidden="true" />+ Nueva campaña
          </button>
        }
      />

      {campanas.length === 0 ? (
        <p className="mt-4 rounded-xl border border-beige bg-arena/50 px-4 py-5 text-center text-sm text-verde-300">
          No hay ninguna campaña. Con una, las primeras membresías se cobran con descuento.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-beige rounded-xl border border-beige">
          {campanas.map((c) => (
            <FilaCampana key={c.id} campana={c} hoy={hoy} onEditar={() => setEditando(c)} />
          ))}
        </ul>
      )}

      {editando !== null && (
        <FormularioCampana
          // Remonta al cambiar de campaña: el borrador arranca de la elegida.
          key={editando === "nueva" ? "nueva" : editando.id}
          campana={editando === "nueva" ? null : editando}
          hoy={hoy}
          onCerrar={() => setEditando(null)}
        />
      )}
    </Card>
  );
}

function FilaCampana({ campana: c, hoy, onEditar }: { campana: CampanaConfig; hoy: string; onEditar: () => void }) {
  const { mostrarAviso } = useToast();
  const [enCurso, iniciar] = useTransition();
  // Segunda pulsación para lo que no se deshace.
  const [confirmando, setConfirmando] = useState(false);
  const estado = estadoDeCampana(c, hoy);
  const meta = metaDe(c.tramos);
  const pct = meta > 0 ? Math.min(100, Math.round((c.vendidas / meta) * 100)) : 0;
  const terminada = estado === "Terminada";
  // Sin ventas se borra; con ventas solo se termina (su historia la necesita).
  const borrar = c.vendidas === 0;

  function quitar() {
    if (!confirmando) return setConfirmando(true);
    iniciar(async () => {
      const r = borrar ? await eliminarCampana(c.id) : await terminarCampana(c.id);
      setConfirmando(false);
      if (!r.ok) return mostrarAviso(r.error, "error");
      mostrarAviso(
        borrar ? `«${c.nombre}» borrada.` : `«${c.nombre}» terminada: desde ahora se cobra precio normal.`,
        "success",
      );
    });
  }

  return (
    <li className="space-y-3 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-verde">{c.nombre}</p>
          <p className="text-sm text-verde-300">
            {rango(c.desde, c.hasta)}
            {c.inicioMembresias && ` · las membresías empiezan el ${fecha(c.inicioMembresias)}`}
          </p>
        </div>
        <Pastilla simbolo={TONO[estado].simbolo} texto={estado} clase={TONO[estado].clase} />
      </div>

      {/* Avance: cifra escrita + barra (la barra es decoración). */}
      <div>
        <p className="text-sm text-verde-700">
          <span className="font-cifra font-normal text-verde">
            {numero(c.vendidas)} de {numero(meta)}
          </span>{" "}
          membresías vendidas
        </p>
        <div aria-hidden="true" className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-beige">
          <div className="h-full rounded-full bg-dorado" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ul className="flex flex-wrap gap-2" aria-label="Tramos">
        {c.tramos.map((t, i) => (
          <li key={i} className="rounded-full border border-beige px-3 py-1 text-xs text-verde-700">
            {i === 0 ? "Primeras" : "Siguientes"} <span className="font-cifra">{numero(t.cupos)}</span> ·{" "}
            <span className="font-cifra font-bold text-dorado-tinta">−{t.pct} %</span>
          </li>
        ))}
      </ul>

      {!terminada && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onEditar} disabled={enCurso} className={BOTON}>
            <span className="control-sheen" aria-hidden="true" />
            Editar
          </button>
          {/* Una programada sin ventas se borra; una en curso con ventas, se
              termina. Una programada no puede tener ventas: siempre se borra. */}
          <button type="button" onClick={quitar} disabled={enCurso} className={BOTON}>
            <span className="control-sheen" aria-hidden="true" />
            {enCurso
              ? "Un momento…"
              : confirmando
                ? borrar
                  ? "Sí, borrarla"
                  : "Sí, terminarla hoy"
                : borrar
                  ? "Borrar"
                  : "Terminar ahora"}
          </button>
          {confirmando && (
            <>
              <button type="button" onClick={() => setConfirmando(false)} disabled={enCurso} className={BOTON}>
                <span className="control-sheen" aria-hidden="true" />
                Volver
              </button>
              <p role="status" className="w-full text-xs text-[var(--color-estado-aviso)]">
                {borrar
                  ? "▲ Se borra la campaña. No ha vendido ninguna membresía."
                  : `▲ Desde ahora se cobra precio normal. Las ${numero(c.vendidas)} vendidas se quedan con su descuento.`}
              </p>
            </>
          )}
        </div>
      )}
    </li>
  );
}

function FormularioCampana({
  campana,
  hoy,
  onCerrar,
}: {
  campana: CampanaConfig | null;
  hoy: string;
  onCerrar: () => void;
}) {
  const { mostrarAviso } = useToast();
  const [enCurso, iniciar] = useTransition();
  const nueva = campana === null;

  const [nombre, setNombre] = useState(campana?.nombre ?? "Preinscripciones de apertura");
  const [desde, setDesde] = useState(campana?.desde ?? hoy);
  // Siete días, como la apertura: del día elegido al sexto siguiente.
  const [hasta, setHasta] = useState(campana?.hasta ?? sumarDias(hoy, 6));
  const [conInicio, setConInicio] = useState(Boolean(campana?.inicioMembresias));
  const [inicio, setInicio] = useState(campana?.inicioMembresias ?? "");
  const [tramos, setTramos] = useState<TramoEnEdicion[]>(
    (campana?.tramos ?? TRAMOS_APERTURA).map((t) => ({ cupos: String(t.cupos), pct: t.pct })),
  );
  // Los errores se enseñan tras el primer intento de guardar: antes, no
  // castigan lo que se está escribiendo.
  const [intentado, setIntentado] = useState(false);
  const [errorServidor, setErrorServidor] = useState<{ error: string; campo?: CampoCampana } | null>(null);

  const borrador: BorradorCampana = {
    nombre,
    desde,
    hasta,
    inicio: conInicio ? inicio : "",
    tramos: tramos.map((t) => ({ cupos: Number(t.cupos || 0), pct: t.pct })),
  };
  const errores = erroresCampana(borrador, hoy, nueva);
  const error = (campo: CampoCampana) =>
    errorServidor?.campo === campo ? errorServidor.error : intentado ? errores[campo] : undefined;
  const meta = metaDe(borrador.tramos);
  const tramosValidos = !errores.tramos;
  // Bajar los tramos por debajo de lo vendido agota la campaña: se avisa.
  const agotada = campana !== null && tramosValidos && meta <= campana.vendidas;

  function cambiarTramo(i: number, cambio: Partial<TramoEnEdicion>) {
    setTramos((ts) => ts.map((t, j) => (j === i ? { ...t, ...cambio } : t)));
    setErrorServidor(null);
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setIntentado(true);
    setErrorServidor(null);
    if (Object.keys(errores).length > 0) return;
    iniciar(async () => {
      const r = await guardarCampana(campana?.id ?? null, borrador);
      if (!r.ok) return setErrorServidor({ error: r.error, campo: r.campo });
      onCerrar();
      mostrarAviso(
        nueva ? `«${nombre.trim()}» creada: ${frasesTramos(borrador.tramos)}.` : "Campaña guardada.",
        "success",
      );
    });
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      cerrable={!enCurso}
      titulo={nueva ? "Nueva campaña de descuento" : `Editar «${campana.nombre}»`}
      tamano="lg"
    >
      <form onSubmit={enviar} noValidate className="space-y-4">
        <CampoTexto
          nombre="campana-nombre"
          etiqueta="Nombre"
          maxLength={80}
          autoComplete="off"
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value);
            setErrorServidor(null);
          }}
          error={error("nombre")}
          ancho
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            nombre="campana-desde"
            etiqueta="Primer día"
            type="date"
            // Una que ya empezó conserva su primer día aunque sea pasado.
            min={nueva ? hoy : undefined}
            value={desde}
            onChange={(e) => {
              setDesde(e.target.value);
              setErrorServidor(null);
            }}
            error={error("desde")}
          />
          <CampoTexto
            nombre="campana-hasta"
            etiqueta="Último día"
            type="date"
            min={desde > hoy ? desde : hoy}
            value={hasta}
            onChange={(e) => {
              setHasta(e.target.value);
              setErrorServidor(null);
            }}
            error={error("hasta")}
            ayuda={
              !errores.desde && !errores.hasta
                ? `${Math.round((Date.parse(hasta) - Date.parse(desde)) / 86400000) + 1} días, incluido el último.`
                : undefined
            }
          />
        </div>

        <fieldset className="space-y-3">
          <legend className="mb-1.5 text-sm font-medium text-verde">Tramos</legend>
          {/* Una línea por tramo que se lee como frase: «Primeras [20] al
              [15 %]». Sin etiqueta encima de cada campo (repetidas en cada
              fila recargaban el formulario): el nombre accesible lo da
              `aria-label`, con el número de tramo. */}
          <ol className="space-y-2">
            {tramos.map((t, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-verde-700">
                <span className="w-[4.75rem] shrink-0">{i === 0 ? "Primeras" : "Siguientes"}</span>
                {/* Cajas propias: `control()` trae `w-full`, que pisaría el ancho
                    puesto en el propio control. */}
                <div className="min-w-0 flex-1">
                  <input
                    aria-label={`Membresías del tramo ${i + 1}`}
                    aria-invalid={error("tramos") && Number(t.cupos || 0) < 1 ? true : undefined}
                    inputMode="numeric"
                    autoComplete="off"
                    value={t.cupos}
                    onChange={(e) => cambiarTramo(i, { cupos: soloDigitos(e.target.value).slice(0, 5) })}
                    className={`${control(Boolean(error("tramos")) && Number(t.cupos || 0) < 1)} font-cifra`}
                  />
                </div>
                <span className="shrink-0">al</span>
                <div className="w-[5.5rem] shrink-0">
                  <select
                    aria-label={`Descuento del tramo ${i + 1}`}
                    value={String(t.pct)}
                    onChange={(e) => cambiarTramo(i, { pct: Number(e.target.value) })}
                    className={`${control(false)} font-cifra`}
                  >
                    {/* Un % que no está en la lista (puesto por SQL) no se pierde. */}
                    {[...new Set([...PORCENTAJES_CAMPANA, t.pct])]
                      .sort((a, b) => a - b)
                      .map((p) => (
                        <option key={p} value={p}>
                          {p} %
                        </option>
                      ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setTramos((ts) => ts.filter((_, j) => j !== i))}
                  disabled={tramos.length === 1}
                  aria-label={`Quitar el tramo ${i + 1}`}
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-beige text-verde-300 transition-colors duration-300 hover:border-dorado hover:text-verde disabled:invisible"
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
          {tramos.length < MAX_TRAMOS && (
            <button
              type="button"
              onClick={() =>
                setTramos((ts) => [
                  ...ts,
                  // El siguiente arranca con un escalón menos de descuento.
                  { cupos: "", pct: Math.max(PORCENTAJES_CAMPANA[0], (ts[ts.length - 1]?.pct ?? 10) - 5) },
                ])
              }
              className={BOTON}
            >
              <span className="control-sheen" aria-hidden="true" />+ Añadir tramo
            </button>
          )}

          {/* Eco de lo que va a pasar, en palabras. */}
          <div aria-live="polite">
            {error("tramos") ? (
              <p className="text-sm text-[var(--color-estado-grave)]">{error("tramos")}</p>
            ) : (
              tramosValidos && (
                <p className="rounded-xl border border-beige bg-arena/50 px-4 py-3 text-sm text-verde-700">
                  Meta: <span className="font-cifra font-normal text-verde">{numero(meta)}</span> membresías. Se cobran{" "}
                  {frasesTramos(borrador.tramos)}; después, precio normal. Solo la primera membresía de cada
                  cliente.
                </p>
              )
            )}
            {agotada && (
              <p className="mt-2 text-xs text-[var(--color-estado-aviso)]">
                ▲ Ya se vendieron {numero(campana.vendidas)}: con estos tramos no queda ningún cupo con descuento.
              </p>
            )}
            {campana && campana.vendidas > 0 && !agotada && (
              <p className="mt-2 text-xs text-verde-300">
                Las {numero(campana.vendidas)} ya vendidas cuentan dentro de los tramos y conservan el descuento con el
                que se cobraron.
              </p>
            )}
          </div>
        </fieldset>

        <div className="space-y-2">
          <CampoCheck
            nombre="campana-con-inicio"
            checked={conInicio}
            onChange={(v) => {
              setConInicio(v);
              if (v && !inicio) setInicio(sumarDias(hasta, 1));
              setErrorServidor(null);
            }}
            ancho
          >
            Las membresías de la campaña empiezan otro día (por ejemplo, el de la apertura)
          </CampoCheck>
          {conInicio && (
            <div className="sm:w-1/2">
              <CampoTexto
                nombre="campana-inicio"
                etiqueta="Empiezan el"
                type="date"
                min={desde}
                value={inicio}
                onChange={(e) => {
                  setInicio(e.target.value);
                  setErrorServidor(null);
                }}
                error={error("inicio")}
                ayuda="Los 30 días cuentan desde ese día, no desde el pago."
              />
            </div>
          )}
        </div>

        {errorServidor && !errorServidor.campo && (
          <p
            role="alert"
            className="rounded-xl border border-[color-mix(in_srgb,var(--color-estado-grave)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-estado-grave)_8%,transparent)] px-4 py-3 text-sm text-[var(--color-estado-grave)]"
          >
            {errorServidor.error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCerrar} disabled={enCurso} className={BOTON}>
            <span className="control-sheen" aria-hidden="true" />
            Volver
          </button>
          <button type="submit" disabled={enCurso} className={BOTON_PRIMARIO}>
            {enCurso ? "Guardando…" : nueva ? "Crear campaña" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
