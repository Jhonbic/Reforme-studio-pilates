"use client";

import { useRef, useState } from "react";
import Modal from "@/components/admin/Modal";
import CampoSelect from "@/components/admin/campos/CampoSelect";
import CampoTexto from "@/components/admin/campos/CampoTexto";
import { AVISO } from "@/components/admin/campos/estilos";
import {
  CUPOS_SUGERIDOS,
  DURACIONES_MIN,
  HORAS_CLASE,
  TIPOS_CLASE,
} from "@/lib/admin/catalogos";
import { numero } from "@/lib/admin/format";
import { duracionLegible, rangoHorario, seSolapan } from "@/lib/admin/horario";
import type {
  BorradorClase,
  ClaseEnAgenda,
  MiembroEquipo,
  TipoClase,
} from "@/lib/admin/types";
import { soloDigitos } from "@/lib/validacion";

const BOTON_PRIMARIO =
  "inline-flex min-h-[44px] items-center justify-center rounded-full bg-dorado px-5 text-sm font-medium text-verde-900 transition-colors duration-300 hover:bg-dorado-dark";

const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center justify-center gap-2 overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde";

type Campo = "instructoraId" | "cupos" | "fecha";
type Errores = Partial<Record<Campo, string>>;

/** El orden en que se enfocan al fallar el envío. */
const ORDEN: Campo[] = ["fecha", "instructoraId", "cupos"];

/**
 * Alta y edición de una clase.
 *
 * Un solo componente para las dos cosas, como `FormularioPlan`: los campos son
 * idénticos y dos formularios gemelos acaban divergiendo siempre.
 *
 * ⚠️ **NO GUARDA NADA**, y lo dice al enviar. El horario vive en `mock.ts` como
 * constante de módulo: mutarlo se perdería en el siguiente render del servidor
 * y —lo peor— *parecería* que funciona.
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
  hoy,
  instructoras,
  clases,
  onCerrar,
  onGuardado,
}: {
  abierto: boolean;
  /** `undefined` = clase nueva. */
  clase?: ClaseEnAgenda;
  /** El día que se está mirando en la agenda: es el que se propone al crear. */
  fechaPorDefecto: string;
  hoy: string;
  instructoras: MiembroEquipo[];
  /** La agenda entera, para detectar choques de horario. */
  clases: ClaseEnAgenda[];
  onCerrar: () => void;
  onGuardado: (resumen: string, esNueva: boolean) => void;
}) {
  const esNueva = clase === undefined;

  function vacia(fecha: string): BorradorClase {
    return {
      tipo: "Reformer",
      fecha,
      horaInicio: "07:00",
      duracionMin: 50,
      /* Vacío a propósito y sin preseleccionar a la primera instructora: quién
         da la clase es una decisión, y un desplegable ya relleno se acepta sin
         mirarlo. */
      instructoraId: "",
      cupos: CUPOS_SUGERIDOS.Reformer,
    };
  }

  function aBorrador(c: ClaseEnAgenda): BorradorClase {
    return {
      tipo: c.tipo,
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

  /* Resincroniza al cambiar de clase (o al pasar de editar a crear). Sin esto,
     abrir «editar las 07:00», cerrar y pulsar «Nueva clase» enseñaría los datos
     de la primera. Mismo patrón que `FormularioPlan`. */
  const claveActual = `${clase?.id ?? "nueva"}|${fechaPorDefecto}`;
  const [ultimaClave, setUltimaClave] = useState(claveActual);
  if (claveActual !== ultimaClave) {
    setUltimaClave(claveActual);
    setV(clase ? aBorrador(clase) : vacia(fechaPorDefecto));
    setErrores({});
    setCuposTocados(false);
  }

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
  const choque = v.instructoraId
    ? (clases.find(
        (c) =>
          c.id !== clase?.id &&
          !c.cancelada &&
          c.fecha === v.fecha &&
          c.instructoraId === v.instructoraId &&
          seSolapan(c.horaInicio, c.duracionMin, v.horaInicio, v.duracionMin),
      ) ?? null)
    : null;

  /* Dos clases a la vez con instructoras distintas son legítimas —hacen falta
     dos salas— pero conviene saberlo. Es la tercera categoría del proyecto: el
     aviso ámbar que NO bloquea, como «el teléfono de emergencia es el mismo del
     cliente» en el alta. */
  const simultanea =
    clases.find(
      (c) =>
        c.id !== clase?.id &&
        !c.cancelada &&
        c.fecha === v.fecha &&
        c.instructoraId !== v.instructoraId &&
        seSolapan(c.horaInicio, c.duracionMin, v.horaInicio, v.duracionMin),
    ) ?? null;

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
      case "instructoraId":
        return valores.instructoraId ? "" : "Elige quién va a dar la clase.";
      case "cupos":
        if (valores.cupos <= 0) return "Tiene que caber al menos una persona.";
        /* El aforo no puede quedar por debajo de la gente que ya reservó: esas
           personas tienen su sitio confirmado y el sistema no puede dejarlas
           fuera sin que nadie decida a quién. */
        return clase && valores.cupos < clase.reservas
          ? `Ya hay ${numero(clase.reservas)} ${clase.reservas === 1 ? "reserva" : "reservas"}: el aforo no puede bajar de ahí sin cancelarlas antes.`
          : "";
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
    if (choque) {
      refs.current.instructoraId?.focus();
      return;
    }

    const nombre =
      instructoras.find((i) => i.id === v.instructoraId)?.nombre ?? "";
    onGuardado(
      `${v.tipo} del ${v.fecha} a las ${v.horaInicio} con ${nombre}`,
      esNueva,
    );
    onCerrar();
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={esNueva ? "Nueva clase" : `Editar la clase de las ${clase.horaInicio}`}
      tamano="lg"
    >
      <form onSubmit={enviar} noValidate className="space-y-4">
        {/* Qué se da y cuánta gente cabe: se leen juntos, el aforo depende de la
            modalidad. El resto de campos NO se emparejan porque un formulario a
            dos columnas de verdad rompe el recorrido vertical. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelect
            nombre="tipo"
            etiqueta="Modalidad"
            value={v.tipo}
            onChange={(e) => set("tipo", e.target.value as TipoClase)}
            ayuda="Al cambiarla se ajusta el aforo sugerido."
          >
            {TIPOS_CLASE.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </CampoSelect>

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
              clase && clase.reservas > 0
                ? `${numero(clase.reservas)} ya ${clase.reservas === 1 ? "reservó" : "reservaron"}.`
                : "Cuántas personas caben en la sala."
            }
            autoComplete="off"
            ref={(el) => {
              refs.current.cupos = el;
            }}
          />
        </div>

        {/* Cuándo */}
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
            ayuda="El estudio abre de 05:00 a 21:00."
          >
            {HORAS_CLASE.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </CampoSelect>
        </div>

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

        {/* Aviso ámbar: no bloquea. Se calla si hay choque — dos mensajes sobre
            el mismo horario compiten, y manda el que impide guardar. */}
        {!choque && simultanea && (
          <p className={AVISO}>
            A esa hora ya hay {simultanea.tipo} con {simultanea.instructora} (
            {simultanea.horaInicio}–{simultanea.horaFin}). Se puede, pero hacen
            falta dos salas.
          </p>
        )}

        <p className="rounded-xl border border-dashed border-dorado/50 bg-dorado/5 px-4 py-3 text-sm text-verde-700">
          Este formulario <strong>no guarda todavía</strong>: el horario vive en
          el código. Sirve para acordar qué define una clase antes de que exista
          la base de datos.
        </p>

        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCerrar} className={BOTON}>
            <span className="control-sheen" aria-hidden="true" />
            Cancelar
          </button>
          <button type="submit" className={BOTON_PRIMARIO}>
            {esNueva ? "Crear clase" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
