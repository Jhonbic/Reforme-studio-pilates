"use client";

import { useRef, useState, useTransition } from "react";
import Modal from "@/components/admin/Modal";
import CampoSelect from "@/components/admin/campos/CampoSelect";
import CampoTexto from "@/components/admin/campos/CampoTexto";
import {
  CUPOS_SUGERIDOS,
  DURACIONES_MIN,
  HORAS_CLASE,
  TIPOS_CLASE,
} from "@/lib/admin/catalogos";
import { editarClaseSemanal, guardarClase } from "@/lib/admin/acciones";
import { fecha as fechaCorta, numero } from "@/lib/admin/format";
import {
  cadaSemana,
  diaLargo,
  diasEntre,
  duracionLegible,
  rangoHorario,
  seSolapan,
  sumarDias,
} from "@/lib/admin/horario";
import { salaDeClase } from "@/lib/admin/salas";
import type {
  BorradorClase,
  ClaseEnAgenda,
  MiembroEquipo,
  Sala,
  SalaId,
  TipoClase,
} from "@/lib/admin/types";
import { soloDigitos } from "@/lib/validacion";
import Opciones from "./Opciones";

const BOTON_PRIMARIO =
  "inline-flex min-h-[44px] items-center justify-center rounded-full bg-dorado px-5 text-sm font-medium text-verde-900 transition-colors duration-300 hover:bg-dorado-dark";

/** Aviso ámbar en caja: no bloquea el guardado. */
const AVISO_CAJA =
  "rounded-xl border border-[color-mix(in_srgb,var(--color-estado-aviso)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-estado-aviso)_8%,transparent)] px-4 py-3 text-sm text-[var(--color-estado-aviso)]";

const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center justify-center gap-2 overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde";

type Campo = "instructoraId" | "cupos" | "fecha" | "horaInicio" | "hasta";
type Errores = Partial<Record<Campo, string>>;

/** El orden en que se enfocan al fallar el envío. */
const ORDEN: Campo[] = ["fecha", "horaInicio", "instructoraId", "cupos", "hasta"];

/** Una serie dura como mucho un año (la base lo vuelve a impedir). */
const MAX_DIAS_SERIE = 366;

/**
 * Hasta cuándo se propone una serie nueva: el último día del mes que viene
 * después del siguiente (del 12 de octubre, el 31 de diciembre). Un fin
 * redondo se entiende y se recuerda; «12 semanas» no.
 */
function finPorDefecto(fecha: string): string {
  const [a, m] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m + 2, 0)).toISOString().slice(0, 10);
}

/** El primer día desde `desde` (incluido) que cae el mismo día de la semana que `base`. */
function mismoDiaDesde(base: string, desde: string): string {
  const semanas = Math.ceil(diasEntre(base, desde) / 7);
  return sumarDias(base, 7 * Math.max(semanas, 0));
}

/** Cuántas clases salen de `desde` a `hasta`, una por semana, y la última. */
function semanasEntre(desde: string, hasta: string): { n: number; ultima: string } {
  if (hasta < desde) return { n: 0, ultima: desde };
  const n = Math.floor(diasEntre(desde, hasta) / 7) + 1;
  return { n, ultima: sumarDias(desde, 7 * (n - 1)) };
}

/**
 * Alta y edición de una clase.
 *
 * Un solo componente para las dos cosas, como `FormularioPlan`: los campos son
 * idénticos y dos formularios gemelos acaban divergiendo siempre.
 *
 * ⚠️ **Las clases que se repiten se crean AQUÍ** (oct 2026), como en el
 * calendario del móvil: «¿Se repite? Solo este día / Todos los lunes». Antes
 * había una pantalla aparte («Horario semanal») con otra idea —la plantilla—
 * y el administrador no entendía qué pasaba al encenderla. Al editar una clase
 * que se repite se pregunta «solo esta / todas las próximas». En «todas» no se
 * cambian día, hora ni modalidad: eso es otra serie (se quita y se crea).
 *
 * ⚠️ **Aquí el foco va al primer campo inválido y NO a un resumen de errores**,
 * al revés que el alta de cliente. No es una incoherencia: el alta tiene catorce
 * campos repartidos en cinco secciones, donde ir de uno en uno es tortura por
 * goteo; esto son seis campos dentro de un diálogo que cabe en pantalla, y un
 * resumen encima sería un rodeo para llegar a lo que ya se ve.
 */
export default function FormularioClase({
  abierto,
  clase,
  fechaPorDefecto,
  propuesta,
  hoy,
  instructoras,
  salas,
  clases,
  onCerrar,
  onGuardado,
}: {
  abierto: boolean;
  /** `undefined` = clase nueva. */
  clase?: ClaseEnAgenda;
  /** El día que se está mirando en la agenda: es el que se propone al crear. */
  fechaPorDefecto: string;
  /** Hueco de la rejilla desde el que se abrió: hora y sala ya puestas. */
  propuesta?: { horaInicio: string; sala: SalaId };
  hoy: string;
  instructoras: MiembroEquipo[];
  /** Las dos salas y su aforo (tabla `salas`). */
  salas: Sala[];
  /** La agenda entera, para detectar choques de horario. */
  clases: ClaseEnAgenda[];
  onCerrar: () => void;
  /** El aviso que se enseña al guardar, ya redactado. */
  onGuardado: (mensaje: string) => void;
}) {
  const esNueva = clase === undefined;
  /* Al crear: ¿se repite cada semana? Por defecto sí: lo normal en un estudio
     es un horario fijo, y una clase suelta es la excepción. */
  const [repite, setRepite] = useState<"semana" | "dia">("semana");
  /* Al editar una clase que se repite: ¿solo esta o todas las próximas? Por
     defecto, solo esta: lo que se cambia sin pensar no debe tocar 12 semanas. */
  const [alcance, setAlcance] = useState<"esta" | "todas">("esta");
  /* El fin de la serie que se escribió a mano; `null` = el propuesto. */
  const [hastaPropio, setHastaPropio] = useState<string | null>(null);

  function vacia(fecha: string): BorradorClase {
    const sala = propuesta?.sala ?? "Reformer";
    return {
      tipo: sala,
      sala,
      fecha,
      horaInicio: propuesta?.horaInicio ?? "07:00",
      duracionMin: 50,
      /* Vacío a propósito y sin preseleccionar a la primera instructora: quién
         da la clase es una decisión, y un desplegable ya relleno se acepta sin
         mirarlo. */
      instructoraId: "",
      cupos: CUPOS_SUGERIDOS[sala],
    };
  }

  function aBorrador(c: ClaseEnAgenda): BorradorClase {
    return {
      tipo: c.tipo,
      sala: c.sala,
      fecha: c.fecha,
      horaInicio: c.horaInicio,
      duracionMin: c.duracionMin,
      instructoraId: c.instructoraId,
      cupos: c.cupos,
    };
  }

  const [v, setV] = useState<BorradorClase>(() =>
    clase ? aBorrador(clase) : vacia(fechaPorDefecto),
  );
  const [errores, setErrores] = useState<Errores>({});
  /* Mientras nadie toque el aforo a mano, sigue a la modalidad. En cuanto se
     escribe un número, el tipo deja de pisarlo: nada molesta más que un campo
     que se reescribe solo después de haberlo puesto. */
  const [cuposTocados, setCuposTocados] = useState(false);
  const refs = useRef<Partial<Record<Campo, HTMLElement | null>>>({});
  /** Fallo del servidor que no es de un campo concreto. */
  const [errorEnvio, setErrorEnvio] = useState("");
  const [guardando, iniciarGuardado] = useTransition();

  /* Resincroniza al cambiar de clase (o al pasar de editar a crear). Sin esto,
     abrir «editar las 07:00», cerrar y pulsar «Nueva clase» enseñaría los datos
     de la primera. Mismo patrón que `FormularioPlan`. */
  const claveActual = `${clase?.id ?? "nueva"}|${fechaPorDefecto}|${propuesta?.horaInicio ?? ""}|${propuesta?.sala ?? ""}`;
  const [ultimaClave, setUltimaClave] = useState(claveActual);
  if (claveActual !== ultimaClave) {
    setUltimaClave(claveActual);
    setV(clase ? aBorrador(clase) : vacia(fechaPorDefecto));
    setErrores({});
    setCuposTocados(false);
    setRepite("semana");
    setAlcance("esta");
    setHastaPropio(null);
  }

  /* Una privada no se repite: se programa día a día. */
  const repetir = esNueva && v.tipo !== "Privada" && repite === "semana";
  /* Cambiar toda la serie: no se tocan día, hora ni modalidad. */
  const enSerie = !esNueva && clase.franjaId !== null && alcance === "todas";
  const cada = cadaSemana(v.fecha);

  /* ⚠️ Hasta cuándo llega la serie. Mientras nadie lo toque se DERIVA (del día
     elegido al crear, o del fin actual de la serie al editar), no se copia:
     así cambiar el día de una clase nueva mueve también la propuesta de fin.
     Mismo patrón que los «mismo que…» del alta de cliente. */
  const finSerie = clase?.serieHasta ?? null;
  const hasta =
    hastaPropio ?? (esNueva ? finPorDefecto(v.fecha) : (finSerie ?? sumarDias(v.fecha, 84)));
  const minHasta = esNueva ? v.fecha : v.fecha < hoy ? hoy : v.fecha;
  const maxHasta = sumarDias(esNueva ? v.fecha : hoy, MAX_DIAS_SERIE);
  const nuevas = semanasEntre(v.fecha, hasta);
  /* Al editar la serie: cuántas se añaden o se quitan respecto al fin actual. */
  const fin = finSerie ?? hasta;
  /* Contando solo el día de la semana de la serie (los miércoles), no 7 días
     desde cualquier fecha: si no, «se añaden 5» y salían 4. */
  const seAnaden =
    enSerie && hasta > fin ? semanasEntre(mismoDiaDesde(v.fecha, sumarDias(fin, 1)), hasta) : null;
  const seQuitan =
    enSerie && hasta < fin ? semanasEntre(mismoDiaDesde(v.fecha, sumarDias(hasta, 1)), fin) : null;
  const quitanConReservas = seQuitan
    ? clases.filter(
        (c) => c.franjaId === clase?.franjaId && !c.cancelada && c.fecha > hasta && c.reservas > 0,
      ).length
    : 0;

  /**
   * ⚠️ **El choque de horarios se calcula en vivo, no al enviar.**
   *
   * La regla general del proyecto es «premia pronto, castiga tarde»: los errores
   * de formato solo salen al salir del campo. Aquí no aplica, porque los cuatro
   * campos que producen el choque —fecha, hora, duración e instructora— son
   * desplegables: no hay nada a medio escribir que castigar. En el instante en
   * que los cuatro tienen valor, o chocan o no chocan, y esconderlo hasta pulsar
   * «Crear» solo retrasa la mala noticia.
   *
   * Las canceladas no cuentan: su hueco está libre, para eso se anularon.
   */
  const choque = !enSerie && v.instructoraId
    ? (clases.find(
        (c) =>
          c.id !== clase?.id &&
          !c.cancelada &&
          c.fecha === v.fecha &&
          c.instructoraId === v.instructoraId &&
          seSolapan(c.horaInicio, c.duracionMin, v.horaInicio, v.duracionMin),
      ) ?? null)
    : null;

  /* ⚠️ Hay DOS salas (Reformer y Mat): dos clases a la vez en la MISMA sala
     no caben, y se dice en vivo, como el choque de instructora. En salas
     distintas no hay nada que avisar. Antes era un aviso ámbar («hacen falta
     dos salas»); con las salas reales es un bloqueo, y la base lo impide
     (`clases_sala_sin_solapes`). */
  const sala = salaDeClase(v.tipo, v.sala);
  const capacidad = salas.find((s) => s.id === sala)?.capacidad ?? 0;
  const salaOcupada = enSerie
    ? null
    : (clases.find(
        (c) =>
          c.id !== clase?.id &&
          !c.cancelada &&
          c.fecha === v.fecha &&
          c.sala === sala &&
          seSolapan(c.horaInicio, c.duracionMin, v.horaInicio, v.duracionMin),
      ) ?? null);

  /* ⚠️ Las semanas SIGUIENTES que chocan no bloquean: solo la primera (la que
     se está viendo) tiene que poder crearse. Las demás se saltan y se avisa
     antes de pulsar de cuántas son. Se mira la agenda cargada (13 semanas). */
  const ultimaFecha = clases.at(-1)?.fecha ?? v.fecha;
  let semanasOcupadas = 0;
  if (repetir) {
    const tope = hasta < ultimaFecha ? hasta : ultimaFecha;
    for (let f = sumarDias(v.fecha, 7); f <= tope; f = sumarDias(f, 7)) {
      const fecha = f;
      const ocupada = clases.some(
        (c) =>
          !c.cancelada &&
          c.fecha === fecha &&
          (c.sala === sala || (v.instructoraId !== "" && c.instructoraId === v.instructoraId)) &&
          seSolapan(c.horaInicio, c.duracionMin, v.horaInicio, v.duracionMin),
      );
      if (ocupada) semanasOcupadas++;
    }
  }

  /* Al cambiar toda la serie: en cuántas de sus próximas clases no entraría
     el cambio (la instructora ya tiene otra a esa hora, o hay más reservas
     que los cupos nuevos). Esas se quedan como están. */
  const serie = enSerie
    ? clases.filter((c) => c.franjaId === clase?.franjaId && !c.cancelada && !c.empezada)
    : [];
  const noEntran = serie.filter(
    (s) =>
      s.reservas > v.cupos ||
      (v.instructoraId !== "" &&
        clases.some(
          (c) =>
            c.id !== s.id &&
            !c.cancelada &&
            c.fecha === s.fecha &&
            c.instructoraId === v.instructoraId &&
            seSolapan(c.horaInicio, c.duracionMin, s.horaInicio, v.duracionMin),
        )),
  ).length;

  function errorDe(campo: Campo, valores: BorradorClase): string {
    switch (campo) {
      case "fecha":
        if (!valores.fecha) return "Elige el día de la clase.";
        /* Editar una clase pasada no llega aquí: la fila no ofrece «Editar»
           cuando ya está «Finalizada». Esto cubre el alta y el teclado, porque
           el `min` del calendario se puede saltar escribiendo la fecha a mano. */
        return valores.fecha < hoy
          ? "No se puede programar una clase en un día que ya pasó."
          : "";
      case "horaInicio":
        return "";
      case "hasta":
        /* Solo cuenta si hay serie: crear repitiendo o cambiar todas. */
        if (!repetir && !enSerie) return "";
        if (!hasta) return "Elige hasta cuándo se repite.";
        if (hasta < minHasta)
          return esNueva
            ? "Tiene que ser el primer día o después."
            : "No puede ser antes de esta clase.";
        return hasta > maxHasta ? "Como mucho, un año." : "";
      case "instructoraId":
        return valores.instructoraId ? "" : "Elige quién va a dar la clase.";
      case "cupos": {
        if (valores.cupos <= 0) return "Tiene que caber al menos una persona.";
        const s = salaDeClase(valores.tipo, valores.sala);
        const tope = salas.find((x) => x.id === s)?.capacidad ?? 0;
        if (tope && valores.cupos > tope) return `En la sala de ${s} caben ${numero(tope)} personas.`;
        /* El aforo no puede quedar por debajo de la gente que ya reservó: esas
           personas tienen su sitio confirmado y el sistema no puede dejarlas
           fuera sin que nadie decida a quién. */
        return clase && !enSerie && valores.cupos < clase.reservas
          ? `Ya hay ${numero(clase.reservas)} ${clase.reservas === 1 ? "reserva" : "reservas"}: el aforo no puede bajar de ahí sin cancelarlas antes.`
          : "";
      }
    }
  }

  function set<K extends keyof BorradorClase>(
    campo: K,
    valor: BorradorClase[K],
  ) {
    setV((prev) => {
      const siguiente = { ...prev, [campo]: valor };

      /* Al cambiar de modalidad, el aforo la sigue mientras nadie lo haya
         tocado: una Privada de 8 personas no es una privada. */
      if (campo === "tipo" && !cuposTocados) {
        siguiente.cupos = CUPOS_SUGERIDOS[valor as TipoClase];
      }
      /* Errores que dependen de dos campos (cupos frente a la sala): si el
         cambio de modalidad o de sala los arregla, se quitan. */
      if ((campo === "tipo" || campo === "sala") && errores.cupos && !errorDe("cupos", siguiente)) {
        setErrores((e) => ({ ...e, cupos: "" }));
      }

      /* `onChange` solo QUITA errores, nunca los pone. */
      const k = campo as Campo;
      if (errores[k] && !errorDe(k, siguiente)) {
        setErrores((e) => ({ ...e, [k]: "" }));
      }

      return siguiente;
    });
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();

    const nuevos: Errores = {};
    for (const c of ORDEN) {
      const err = errorDe(c, v);
      if (err) nuevos[c] = err;
    }
    setErrores(nuevos);

    const primero = ORDEN.find((c) => nuevos[c]);
    if (primero) {
      refs.current[primero]?.focus();
      return;
    }

    /* El choque bloquea aunque no viva en `errores`: ya está en pantalla desde
       antes de pulsar, así que aquí solo hay que no dejar pasar. El foco va a la
       instructora, que es el campo que casi siempre se quiere cambiar. */
    if (salaOcupada) {
      refs.current.horaInicio?.focus();
      return;
    }
    if (choque) {
      refs.current.instructoraId?.focus();
      return;
    }

    const nombre =
      instructoras.find((i) => i.id === v.instructoraId)?.nombre ?? "";
    setErrorEnvio("");
    iniciarGuardado(async () => {
      const r = enSerie
        ? await editarClaseSemanal(clase.franjaId!, v, hasta)
        : await guardarClase(clase?.id ?? null, v, repetir ? hasta : null);
      if (r.ok) {
        const que = `${v.tipo} a las ${v.horaInicio} con ${nombre}`;
        onGuardado(
          repetir
            ? `${v.tipo} ${cada} a las ${v.horaInicio} con ${nombre}: ${r.resumen ?? ""}`
            : enSerie
              ? `Cambios guardados en ${cada}: ${r.resumen ?? ""}.`
              : esNueva
                ? `Clase creada: ${que}, ${diaLargo(v.fecha)}.`
                : `Cambios guardados: ${que}, ${diaLargo(v.fecha)}.`,
        );
        onCerrar();
        return;
      }
      /* Lo que la base rechaza y el formulario no vio venir (otra persona
         programó a esa instructora a esa hora mientras tanto, o apuntó a
         alguien y el aforo ya no puede bajar) va al campo que lo causa. */
      if (r.campo) {
        setErrores((e) => ({ ...e, [r.campo as Campo]: r.error }));
        refs.current[r.campo]?.focus();
        return;
      }
      setErrorEnvio(r.error);
    });
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={esNueva ? "Nueva clase" : `Editar la clase de las ${clase.horaInicio}`}
      tamano="lg"
    >
      <form onSubmit={enviar} noValidate className="space-y-4">
        {/* Lo primero que se decide al editar una clase que se repite: a qué
            afecta el cambio. Arriba, porque cambia qué campos se pueden tocar. */}
        {!esNueva && clase.franjaId && (
          <Opciones
            nombre="alcance"
            leyenda="¿Qué quieres cambiar?"
            valor={alcance}
            onCambio={setAlcance}
            opciones={[
              { valor: "esta", titulo: "Solo esta clase", detalle: diaLargo(clase.fecha) },
              {
                valor: "todas",
                titulo: "Todas las próximas",
                detalle: `${cada} a las ${clase.horaInicio}`,
              },
            ]}
          />
        )}

        {/* Qué se da y cuánta gente cabe: se leen juntos, el aforo depende de la
            modalidad. El resto de campos NO se emparejan porque un formulario a
            dos columnas de verdad rompe el recorrido vertical. */}
        <div className="grid gap-4 sm:grid-cols-2">
          {!enSerie && (
            <CampoSelect
              nombre="tipo"
              etiqueta="Modalidad"
              value={v.tipo}
              onChange={(e) => set("tipo", e.target.value as TipoClase)}
              ayuda={
                v.tipo === "Privada"
                  ? "Una privada se da en la sala que elijas, y no se repite."
                  : `Se da en la sala de ${v.tipo}.`
              }
            >
              {TIPOS_CLASE.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </CampoSelect>
          )}

          <CampoTexto
            nombre="cupos"
            etiqueta="Cupos"
            /* Nunca `type="number"`: admite e/+/−, ignora `maxLength` y pierde
               ceros iniciales. Filtrando a dígitos, «solo números» no existe. */
            inputMode="numeric"
            pattern="\d*"
            value={v.cupos ? String(v.cupos) : ""}
            onChange={(e) => {
              setCuposTocados(true);
              set("cupos", Number(soloDigitos(e.target.value)));
            }}
            error={errores.cupos}
            ayuda={
              enSerie
                ? `En todas las próximas · máximo ${numero(capacidad)}.`
                : clase && clase.reservas > 0
                ? `${numero(clase.reservas)} ya ${clase.reservas === 1 ? "reservó" : "reservaron"} · máximo ${numero(capacidad)}.`
                : `Máximo ${numero(capacidad)}: es lo que cabe en la sala de ${sala}.`
            }
            autoComplete="off"
            ref={(el) => {
              refs.current.cupos = el;
            }}
          />
        </div>

        {/* La sala solo se elige en una privada: Reformer y Mat van siempre en
            la suya, y preguntarlo sería ofrecer un error. */}
        {v.tipo === "Privada" && (
          <CampoSelect
            nombre="sala"
            etiqueta="Sala"
            value={v.sala}
            onChange={(e) => set("sala", e.target.value as SalaId)}
          >
            {salas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </CampoSelect>
        )}

        {/* Cuándo. En «todas las próximas» no se cambia: es lo que define la
            serie, y moverla es quitar esta y crear otra. */}
        {enSerie ? (
          <p className="rounded-xl bg-arena px-4 py-3 text-sm text-verde-700">
            <strong className="text-verde first-letter:uppercase">
              {cada.charAt(0).toUpperCase() + cada.slice(1)} a las {v.horaInicio}
            </strong>{" "}
            · Sala de {sala}. Para cambiar el día o la hora de todas, quita esta clase semanal y
            créala de nuevo a la hora nueva.
          </p>
        ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            nombre="fecha"
            etiqueta="Día"
            type="date"
            /* El calendario no ofrece días pasados. La validación de arriba
               sigue haciendo falta: `min` se salta escribiendo a mano. */
            min={hoy}
            value={v.fecha}
            onChange={(e) => set("fecha", e.target.value)}
            error={errores.fecha}
            ref={(el) => {
              refs.current.fecha = el;
            }}
          />

          <CampoSelect
            nombre="horaInicio"
            etiqueta="Hora de inicio"
            value={v.horaInicio}
            onChange={(e) => set("horaInicio", e.target.value)}
            /* La sala ocupada va AQUÍ: lo normal es arreglarlo cambiando la hora. */
            error={
              salaOcupada
                ? `La sala de ${sala} está ocupada: ${salaOcupada.tipo} con ${salaOcupada.instructora} de ${salaOcupada.horaInicio} a ${salaOcupada.horaFin}.`
                : errores.horaInicio
            }
            ayuda="El estudio abre de 05:00 a 21:00."
            ref={(el) => {
              refs.current.horaInicio = el;
            }}
          >
            {HORAS_CLASE.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </CampoSelect>
        </div>
        )}

        {/* Duración a media columna, con el eco al lado — el mismo reparto que
            la fecha de nacimiento y el eco de la edad en el alta de cliente. */}
        <div className="grid items-end gap-4 sm:grid-cols-2">
          <CampoSelect
            nombre="duracionMin"
            etiqueta="Duración"
            value={String(v.duracionMin)}
            onChange={(e) => set("duracionMin", Number(e.target.value))}
          >
            {DURACIONES_MIN.map((d) => (
              <option key={d} value={d}>
                {duracionLegible(d)}
              </option>
            ))}
          </CampoSelect>

          {/* La hora de fin no es un campo: se calcula. Ponerla editable dejaría
              inicio, duración y fin pudiendo contradecirse entre sí. */}
          <p className="rounded-xl bg-arena px-4 py-3 text-sm text-verde-700">
            Ocupa de{" "}
            <strong className="tabular-nums text-verde">
              {rangoHorario(v.horaInicio, v.duracionMin)}
            </strong>
          </p>
        </div>

        <CampoSelect
          nombre="instructoraId"
          etiqueta="Quién la da"
          value={v.instructoraId}
          onChange={(e) => set("instructoraId", e.target.value)}
          /* El choque manda sobre el error de campo vacío: si hay conflicto es
             que ya se eligió a alguien. */
          error={
            choque
              ? `Esa instructora ya tiene ${choque.tipo} de ${choque.horaInicio} a ${choque.horaFin} ese día. Cambia la hora o elige a otra persona.`
              : errores.instructoraId
          }
          ayuda={
            /* Solo instructoras EN ACTIVO: ver `getInstructoras()`. Se dice
               aquí porque, si no, faltar en la lista parece un fallo. */
            "Solo aparecen las instructoras en activo."
          }
          ref={(el) => {
            refs.current.instructoraId = el;
          }}
          ancho
        >
          <option value="">Elegir…</option>
          {instructoras.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nombre}
            </option>
          ))}
        </CampoSelect>

        {/* ¿Se repite? Al final, cuando ya se sabe qué, cuándo y con quién: la
            opción dice la frase entera («todos los lunes a las 07:00»). */}
        {esNueva && v.tipo !== "Privada" && (
          <Opciones
            nombre="repite"
            leyenda="¿Se repite?"
            valor={repite}
            onCambio={setRepite}
            opciones={[
              { valor: "dia", titulo: "Solo este día", detalle: diaLargo(v.fecha) },
              {
                valor: "semana",
                titulo: `${cada} a las ${v.horaInicio}`,
                detalle: "Hasta la fecha que elijas.",
              },
            ]}
          />
        )}

        {/* ⚠️ Hasta cuándo: la serie tiene FIN y se crea entera al momento.
            Nada aparece solo después (feedback del usuario: las clases que
            salían cada noche «parecían algo raro»). El eco dice exactamente
            qué va a pasar antes de pulsar. */}
        {(repetir || enSerie) && (
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <CampoTexto
              nombre="hasta"
              etiqueta={enSerie ? "Se repite hasta" : "Hasta"}
              type="date"
              min={minHasta}
              max={maxHasta}
              value={hasta}
              onChange={(e) => {
                setHastaPropio(e.target.value);
                if (errores.hasta) setErrores((x) => ({ ...x, hasta: "" }));
              }}
              error={errores.hasta}
              ref={(el) => {
                refs.current.hasta = el;
              }}
            />
            <p className="rounded-xl bg-arena px-4 py-3 text-sm text-verde-700 sm:mt-7">
              {repetir ? (
                nuevas.n > 0 ? (
                  <>
                    Se crean <strong className="text-verde">{numero(nuevas.n)} {nuevas.n === 1 ? "clase" : "clases"}</strong>
                    {nuevas.n > 1 && (
                      <>
                        , del {fechaCorta(v.fecha)} al {fechaCorta(nuevas.ultima)}
                      </>
                    )}
                    . No aparece ninguna más sola.
                  </>
                ) : (
                  "Elige una fecha a partir del primer día."
                )
              ) : seAnaden && seAnaden.n > 0 ? (
                <>
                  Se añaden <strong className="text-verde">{numero(seAnaden.n)} {seAnaden.n === 1 ? "clase" : "clases"}</strong>, hasta el{" "}
                  {fechaCorta(seAnaden.ultima)}.
                </>
              ) : seQuitan && seQuitan.n > 0 ? (
                <>
                  Se quitan <strong className="text-verde">{numero(seQuitan.n)} {seQuitan.n === 1 ? "clase" : "clases"}</strong> del final
                  {quitanConReservas > 0 &&
                    ` (${numero(quitanConReservas)} con reservas: quedan canceladas para avisar a esa gente)`}
                  .
                </>
              ) : finSerie ? (
                <>Ahora llega hasta el {fechaCorta(finSerie)}. Cambia la fecha para alargarla o acortarla.</>
              ) : (
                "Elige hasta cuándo se repite."
              )}
            </p>
          </div>
        )}

        {/* Avisos que NO bloquean (ámbar): lo que no va a salir, dicho antes. */}
        {repetir && semanasOcupadas > 0 && (
          <p className={AVISO_CAJA}>
            ▲ {semanasOcupadas === 1 ? "Una de las próximas semanas tiene" : `${numero(semanasOcupadas)} de las próximas semanas tienen`}{" "}
            la sala o la instructora ocupadas a esa hora: ahí no se creará la clase.
          </p>
        )}
        {enSerie && noEntran > 0 && (
          <p className={AVISO_CAJA}>
            ▲ En {noEntran === 1 ? "una de las próximas clases" : `${numero(noEntran)} de las próximas clases`} el
            cambio no entra (la instructora ya tiene otra a esa hora, o hay más reservas que cupos):{" "}
            {noEntran === 1 ? "se quedará" : "se quedarán"} como está.
          </p>
        )}

        {errorEnvio && (
          <p role="alert" className="rounded-xl border border-[color-mix(in_srgb,var(--color-estado-grave)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-estado-grave)_8%,transparent)] px-4 py-3 text-sm text-[var(--color-estado-grave)]">
            {errorEnvio}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCerrar} className={BOTON}>
            <span className="control-sheen" aria-hidden="true" />
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className={`${BOTON_PRIMARIO} disabled:opacity-60`}
          >
            {guardando ? "Guardando…" : repetir ? "Crear clases" : enSerie ? "Guardar en todas" : esNueva ? "Crear clase" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
