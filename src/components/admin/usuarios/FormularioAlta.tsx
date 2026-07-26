"use client";

import Link from "next/link";
import {
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import CampoCheck from "@/components/admin/campos/CampoCheck";
import CampoSelect from "@/components/admin/campos/CampoSelect";
import CampoTexto from "@/components/admin/campos/CampoTexto";
import Seccion from "@/components/admin/campos/Seccion";
import ResumenErrores from "./ResumenErrores";
import { descargarCsv, csvFicha } from "./exportar";
import {
  EPS,
  EPS_OTRA,
  ETIQUETA_TIPO,
  TIPOS_ALFANUMERICOS,
  TIPOS_IDENTIFICACION,
  URL_TERMINOS,
} from "@/lib/admin/catalogos";
import { documento, fechaCompacta, telefonoCO } from "@/lib/admin/format";
import type { FichaAlta, TipoIdentificacion } from "@/lib/admin/types";
import {
  DOC_MAX,
  DOC_MIN,
  MAYORIA_DE_EDAD,
  claveNombre,
  edad,
  esCorreo,
  esMovilCO,
  hoyLocalIso,
  normalizarTelefonoPegado,
  sinDigitos,
  soloAlfanumerico,
  soloDigitos,
} from "@/lib/validacion";

/* ------------------------------------------------------------------ campos */

type Campo =
  | "nombre"
  | "identificacion"
  | "fechaNacimiento"
  | "telefono"
  | "correo"
  | "eps"
  | "epsOtra"
  | "emergenciaNombre"
  | "emergenciaTelefono"
  | "tutorNombre"
  | "tutorIdentificacion"
  | "tutorTelefono"
  | "terminos";

/**
 * ⚠️ **Una sola lista para tres cosas**: el orden visual, el orden del resumen de
 * errores y el orden en que se busca el primer campo a enfocar. Con tres listas
 * separadas, el resumen acabaría enumerando los errores en un orden distinto al
 * de la pantalla.
 */
const ORDEN_CAMPOS: { campo: Campo; etiqueta: string }[] = [
  { campo: "nombre", etiqueta: "Nombre completo" },
  { campo: "identificacion", etiqueta: "Número de documento" },
  { campo: "fechaNacimiento", etiqueta: "Fecha de nacimiento" },
  { campo: "telefono", etiqueta: "Teléfono" },
  { campo: "correo", etiqueta: "Correo electrónico" },
  { campo: "eps", etiqueta: "EPS" },
  { campo: "epsOtra", etiqueta: "Nombre de la EPS" },
  { campo: "emergenciaNombre", etiqueta: "Contacto de emergencia" },
  { campo: "emergenciaTelefono", etiqueta: "Teléfono de emergencia" },
  { campo: "tutorNombre", etiqueta: "Nombre del acudiente" },
  { campo: "tutorIdentificacion", etiqueta: "Cédula del acudiente" },
  { campo: "tutorTelefono", etiqueta: "Teléfono del acudiente" },
  { campo: "terminos", etiqueta: "Términos y condiciones" },
];

/** Los del bloque del acudiente. Se limpian en bloque al dejar de ser menor. */
const CAMPOS_ACUDIENTE: Campo[] = [
  "tutorNombre",
  "tutorIdentificacion",
  "tutorTelefono",
];

type Valores = {
  nombre: string;
  tipoIdentificacion: TipoIdentificacion;
  identificacion: string;
  fechaNacimiento: string;
  telefono: string;
  correo: string;
  eps: string;
  epsOtra: string;
  emergenciaNombre: string;
  emergenciaTelefono: string;
  /** ⚠️ Valor PROPIO del acudiente. El efectivo se DERIVA (ver `tutorNombre`). */
  tutorNombrePropio: string;
  tutorIdentificacion: string;
  tutorTelefonoPropio: string;
  mismoNombre: boolean;
  mismoTelefono: boolean;
  terminos: boolean;
};

const INICIAL: Valores = {
  nombre: "",
  tipoIdentificacion: "C.C.",
  identificacion: "",
  fechaNacimiento: "",
  telefono: "",
  correo: "",
  eps: "",
  epsOtra: "",
  emergenciaNombre: "",
  emergenciaTelefono: "",
  tutorNombrePropio: "",
  tutorIdentificacion: "",
  tutorTelefonoPropio: "",
  mismoNombre: false,
  mismoTelefono: false,
  terminos: false,
};

type Errores = Partial<Record<Campo, string>>;

const MSJ_MOVIL = "El móvil colombiano tiene 10 dígitos y empieza por 3.";
const MSJ_DOC = `El documento tiene entre ${DOC_MIN} y ${DOC_MAX} dígitos.`;

/* -------------------------------------------------------------- validación */

type Contexto = {
  esMenor: boolean | null;
  hoy: string;
  /** documento → nombre del cliente que ya lo tiene. */
  documentosExistentes: Record<string, string>;
  /** nombre normalizado → nombre tal cual está escrito en la base. */
  nombresExistentes: Record<string, string>;
  tutorNombre: string;
  tutorTelefono: string;
};

/** El valor visible del campo, para poder saber si está vacío. */
function valorDe(campo: Campo, v: Valores, ctx: Contexto): string {
  switch (campo) {
    case "tutorNombre":
      return ctx.tutorNombre;
    case "tutorTelefono":
      return ctx.tutorTelefono;
    case "terminos":
      return v.terminos ? "sí" : "";
    default:
      return String(v[campo as keyof Valores] ?? "");
  }
}

/**
 * El error de UN campo, con todas las reglas.
 *
 * Se usa igual en el `blur` y en el envío; lo que cambia es quién la llama y
 * cuándo (ver `alSalir`), no la regla. Así es imposible que el mensaje que sale
 * al salir del campo y el que sale al enviar no coincidan.
 */
function errorDe(campo: Campo, v: Valores, ctx: Contexto): string | undefined {
  const alfanumerico = TIPOS_ALFANUMERICOS.includes(v.tipoIdentificacion);

  switch (campo) {
    /* Los números NO se validan aquí: `sinDigitos` los filtra al teclear, así
       que un nombre con dígitos no puede llegar a existir. Un mensaje para eso
       sería código muerto. */
    case "nombre":
      return v.nombre.trim().length >= 3
        ? undefined
        : "Escribe el nombre completo.";

    case "identificacion": {
      const d = v.identificacion;
      if (!d) return "Indica el número de documento.";
      if (!alfanumerico && (d.length < DOC_MIN || d.length > DOC_MAX))
        return MSJ_DOC;
      if (alfanumerico && d.length < 5)
        return "El pasaporte tiene al menos 5 caracteres.";
      const duenio = ctx.documentosExistentes[d];
      if (duenio) return `Ya hay un cliente con este documento: ${duenio}.`;
      return undefined;
    }

    case "fechaNacimiento": {
      if (!v.fechaNacimiento) return "Indica la fecha de nacimiento.";
      // `max` en el input solo acota el CALENDARIO. Con el form en `noValidate`
      // se puede teclear una fecha futura, así que hay que comprobarla igual.
      if (ctx.hoy && v.fechaNacimiento > ctx.hoy)
        return "La fecha de nacimiento no puede ser futura.";
      if (Number(v.fechaNacimiento.slice(0, 4)) < 1920)
        return "Revisa el año de nacimiento.";
      return undefined;
    }

    case "telefono":
      if (!v.telefono) return "Indica el teléfono.";
      return esMovilCO(v.telefono) ? undefined : MSJ_MOVIL;

    // El correo es OPCIONAL: vacío es válido. Solo se valida con contenido.
    case "correo":
      if (!v.correo.trim()) return undefined;
      return esCorreo(v.correo)
        ? undefined
        : "Revisa el correo: le falta el @ o el punto.";

    case "eps":
      return v.eps ? undefined : "Selecciona la EPS.";

    case "epsOtra":
      if (v.eps !== EPS_OTRA) return undefined;
      return v.epsOtra.trim().length >= 3
        ? undefined
        : "Escribe el nombre de la EPS.";

    case "emergenciaNombre":
      return v.emergenciaNombre.trim().length >= 3
        ? undefined
        : "Indica a quién llamar en una emergencia.";

    case "emergenciaTelefono":
      if (!v.emergenciaTelefono) return "Indica el teléfono de emergencia.";
      return esMovilCO(v.emergenciaTelefono) ? undefined : MSJ_MOVIL;

    /* Los tres del acudiente solo existen si es menor. */
    case "tutorNombre":
      if (ctx.esMenor !== true) return undefined;
      // Si está espejado, el dato vive en el contacto de emergencia: el error
      // tiene que salir allí y no aquí, o el mismo problema se contaría dos veces.
      if (v.mismoNombre) return undefined;
      return ctx.tutorNombre.trim().length >= 3
        ? undefined
        : "Indica el nombre del acudiente.";

    case "tutorIdentificacion": {
      if (ctx.esMenor !== true) return undefined;
      const d = v.tutorIdentificacion;
      if (!d) return "Indica la cédula del acudiente.";
      if (d.length < DOC_MIN || d.length > DOC_MAX) return MSJ_DOC;
      if (d === v.identificacion)
        return "La cédula del acudiente no puede ser la misma del menor.";
      return undefined;
    }

    case "tutorTelefono":
      if (ctx.esMenor !== true) return undefined;
      if (v.mismoTelefono) return undefined;
      if (!ctx.tutorTelefono) return "Indica el teléfono del acudiente.";
      return esMovilCO(ctx.tutorTelefono) ? undefined : MSJ_MOVIL;

    case "terminos":
      return v.terminos
        ? undefined
        : "Debes aceptar los términos para continuar.";
  }
}

/**
 * Ámbar: sospechoso pero legítimo. **Nunca impide guardar.**
 *
 * ⚠️ Aquí vive el **nombre repetido**, y es a propósito que sea aviso y no error:
 * dos personas distintas pueden llamarse igual, así que bloquear el alta sería
 * incorrecto. Lo contrario que el **documento**, que sí es error bloqueante
 * porque identifica de forma única a una persona: dos clientes con la misma
 * cédula son la misma persona metida dos veces.
 */
function avisosDe(v: Valores, ctx: Contexto): Partial<Record<Campo, string>> {
  const a: Partial<Record<Campo, string>> = {};

  const t = v.nombre.trim();
  if (t.length >= 3 && !t.includes(" ")) a.nombre = "¿Falta el apellido?";

  const repetido = ctx.nombresExistentes[claveNombre(v.nombre)];
  if (repetido)
    a.nombre = `Ya hay un cliente llamado ${repetido}. Comprueba que no sea la misma persona.`;

  if (v.emergenciaTelefono && v.emergenciaTelefono === v.telefono)
    a.emergenciaTelefono = "Es el mismo teléfono del cliente.";

  return a;
}

/* Referencias estables para `useSyncExternalStore`: si se crearan en cada render
   volvería a suscribirse sin parar. La fecha no cambia sola mientras se rellena
   un formulario, así que no hay nada a lo que suscribirse. */
const sinSuscripcion = () => () => {};
const enServidor = () => "";

/* ------------------------------------------------------------- componente */

export default function FormularioAlta({
  documentosExistentes,
  nombresExistentes,
}: {
  documentosExistentes: Record<string, string>;
  nombresExistentes: Record<string, string>;
}) {
  const [v, setV] = useState<Valores>(INICIAL);
  const [errores, setErrores] = useState<Errores>({});
  const [intentado, setIntentado] = useState(false);
  const [ficha, setFicha] = useState<FichaAlta | null>(null);
  /** Si nadie ha tocado el tipo de documento, la edad puede sugerirlo. */
  const [tipoTocado, setTipoTocado] = useState(false);

  /**
   * La fecha de hoy, **solo en el cliente**.
   *
   * ⚠️ Esta ruta compila como `○ Static`: aunque el componente sea de cliente, se
   * prerenderiza en el build. Un `new Date()` en el cuerpo quedaría congelado en
   * el HTML con la fecha del build → desajuste de hidratación, y un `max` de
   * calendario que envejece cada día que pase sin redesplegar.
   *
   * `useSyncExternalStore` es el primitivo hecho para esto: devuelve `""` en el
   * servidor y en el primer render del cliente, y el valor real a partir de ahí.
   * Un `useEffect` + `setState` haría lo mismo, pero el lint de React 19 lo
   * prohíbe (provoca renders en cascada) y además tendría un render intermedio.
   */
  const hoy = useSyncExternalStore(sinSuscripcion, hoyLocalIso, enServidor);

  const refResumen = useRef<HTMLDivElement>(null);
  const refs = useRef<Record<string, HTMLElement | null>>({});

  /* ---------------------------------------------------------- derivados */

  const anios = hoy && v.fechaNacimiento ? edad(v.fechaNacimiento, hoy) : null;
  /** `null` = todavía no se sabe. **Nunca se afirma «es mayor» desde un valor
   *  desconocido**: con `hoy` aún vacío, el bloque del acudiente no se pinta ni
   *  se da por hecho que sobra. */
  const esMenor = anios === null ? null : anios < MAYORIA_DE_EDAD;

  /* Espejos: se DERIVAN en cada render. Si se copiaran una vez al marcar la
     casilla y luego se editara el contacto de emergencia, el dato del acudiente
     quedaría obsoleto en silencio. Así no hay dos estados que puedan divergir. */
  const tutorNombre = v.mismoNombre ? v.emergenciaNombre : v.tutorNombrePropio;
  const tutorTelefono = v.mismoTelefono
    ? v.emergenciaTelefono
    : v.tutorTelefonoPropio;

  const alfanumerico = TIPOS_ALFANUMERICOS.includes(v.tipoIdentificacion);
  const ctx: Contexto = {
    esMenor,
    hoy,
    documentosExistentes,
    nombresExistentes,
    tutorNombre,
    tutorTelefono,
  };
  const avisos = avisosDe(v, ctx);

  /* ------------------------------------------------------------ setters */

  function set<K extends keyof Valores>(campo: K, valor: Valores[K]) {
    setV((prev) => ({ ...prev, [campo]: valor }));
    /* Al teclear solo se QUITA el error, nunca se pone: castigar mientras se
       escribe pinta en rojo un campo que aún no has terminado de rellenar. */
    setErrores((e) => ({ ...e, [campo as string]: undefined }));
  }

  /** Al salir del campo solo salen errores de FORMATO, y solo si hay contenido:
   *  tabular por un campo vacío que ibas a rellenar luego no debe castigarte. */
  function alSalir(campo: Campo) {
    if (!valorDe(campo, v, ctx)) return;
    setErrores((e) => ({ ...e, [campo]: errorDe(campo, v, ctx) }));
  }

  function cambiarFecha(valor: string) {
    set("fechaNacimiento", valor);
    /* ⚠️ Si se corrige la fecha de menor a adulto, los errores del acudiente
       quedarían huérfanos: bloquearían el envío desde campos que ya no están en
       pantalla. Los valores se conservan por si la corrección fue el error. */
    setErrores((e) => {
      const limpio = { ...e, fechaNacimiento: undefined };
      for (const c of CAMPOS_ACUDIENTE) limpio[c] = undefined;
      return limpio;
    });
  }

  /* ------------------------------------------------------------- envío */

  function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setIntentado(true);

    const nuevos: Errores = {};
    for (const { campo } of ORDEN_CAMPOS) {
      const err = errorDe(campo, v, ctx);
      if (err) nuevos[campo] = err;
    }
    setErrores(nuevos);

    if (Object.keys(nuevos).length > 0) {
      refResumen.current?.focus();
      return;
    }

    const eps = v.eps === EPS_OTRA ? v.epsOtra.trim() : v.eps;
    setFicha({
      nombre: v.nombre.trim(),
      tipoIdentificacion: v.tipoIdentificacion,
      identificacion: v.identificacion,
      fechaNacimiento: v.fechaNacimiento,
      telefono: telefonoCO(v.telefono),
      correo: v.correo.trim().toLowerCase(),
      eps,
      contactoEmergencia: {
        nombre: v.emergenciaNombre.trim(),
        telefono: telefonoCO(v.emergenciaTelefono),
      },
      acudiente:
        esMenor === true
          ? {
              nombre: tutorNombre.trim(),
              identificacion: v.tutorIdentificacion,
              telefono: telefonoCO(tutorTelefono),
            }
          : undefined,
      aceptaTerminos: v.terminos,
    });
  }

  const listaErrores = ORDEN_CAMPOS.filter((c) => errores[c.campo]).map((c) => ({
    campo: c.campo,
    etiqueta: c.etiqueta,
    mensaje: errores[c.campo] as string,
  }));

  /* ------------------------------------------------------------- éxito */

  if (ficha) {
    return (
      <div className="rounded-2xl border border-beige bg-white p-6 text-center shadow-card sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-dorado/15 text-3xl text-dorado-dark">
          ✦
        </div>
        <h2 className="mt-6 font-display text-3xl text-verde">
          Ficha de {ficha.nombre.split(" ")[0]} completada
        </h2>
        {/* Sin eufemismos: el mismo criterio que el aviso del botón de alta. */}
        <p className="mx-auto mt-3 max-w-md text-sm text-verde-700">
          <strong>No se ha guardado en ningún sitio:</strong> el panel todavía no
          tiene base de datos. Descarga la ficha para no perder lo que acabas de
          escribir.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() =>
              descargarCsv(
                `ficha-${ficha.identificacion}.csv`,
                csvFicha(ficha),
              )
            }
            className="control-fx relative inline-flex min-h-[44px] items-center gap-2 overflow-hidden rounded-full bg-verde px-5 text-sm text-arena transition-colors duration-300 hover:bg-verde-700"
          >
            <span className="control-sheen" aria-hidden="true" />
            <span aria-hidden="true">↓</span>
            Descargar la ficha
          </button>
          <button
            type="button"
            onClick={() => {
              setFicha(null);
              setV(INICIAL);
              setErrores({});
              setIntentado(false);
              setTipoTocado(false);
            }}
            className="control-fx relative inline-flex min-h-[44px] items-center gap-2 overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde"
          >
            <span className="control-sheen" aria-hidden="true" />
            Dar de alta a otra persona
          </button>
          <Link
            href="/admin/usuarios"
            className="text-sm text-dorado-dark underline-offset-4 hover:underline"
          >
            Volver al listado
          </Link>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------- formulario */

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {intentado && (
        <ResumenErrores
          ref={refResumen}
          errores={listaErrores}
          onIr={(campo) => refs.current[campo]?.focus()}
        />
      )}

      <Seccion titulo="Datos personales">
        <CampoTexto
          ancho
          nombre="nombre"
          etiqueta="Nombre completo"
          value={v.nombre}
          /* Los dígitos se filtran al teclear, igual que en el documento: un
             nombre de persona no lleva números, así que en vez de avisar después
             simplemente no entran. */
          onChange={(e) => set("nombre", sinDigitos(e.target.value))}
          onBlur={() => alSalir("nombre")}
          error={errores.nombre}
          aviso={avisos.nombre}
          maxLength={80}
          /* ⚠️ `off` a propósito, al revés que en `/registro`: allí cada quien
             escribe sus datos y el autofill ayuda; aquí una recepcionista
             escribe los de OTRA persona y el navegador le metería los suyos. */
          autoComplete="off"
          ref={(el) => {
            refs.current.nombre = el;
          }}
        />

        <CampoSelect
          nombre="tipoIdentificacion"
          etiqueta="Tipo de documento"
          value={v.tipoIdentificacion}
          onChange={(e) => {
            setTipoTocado(true);
            set("tipoIdentificacion", e.target.value as TipoIdentificacion);
            // El filtro de caracteres depende del tipo: al cambiarlo hay que
            // reevaluar lo ya escrito o quedaría un valor imposible para el tipo.
            set("identificacion", "");
          }}
        >
          {TIPOS_IDENTIFICACION.map((t) => (
            <option key={t} value={t}>
              {ETIQUETA_TIPO[t]}
            </option>
          ))}
        </CampoSelect>

        <CampoTexto
          nombre="identificacion"
          etiqueta="Número de documento"
          value={v.identificacion}
          /* Filtrado a dígitos (o alfanumérico en pasaporte): así el error
             «solo números» NUNCA puede llegar a existir. Y nada de
             `type="number"`, que admite e/+/-, ignora `maxLength` y devuelve
             cadena vacía cuando su contenido es inválido. */
          onChange={(e) =>
            set(
              "identificacion",
              alfanumerico
                ? soloAlfanumerico(e.target.value).slice(0, 20)
                : soloDigitos(e.target.value).slice(0, DOC_MAX),
            )
          }
          onBlur={() => alSalir("identificacion")}
          error={errores.identificacion}
          ayuda={
            !alfanumerico && v.identificacion.length >= DOC_MIN
              ? `${v.tipoIdentificacion} ${documento(v.identificacion)}`
              : undefined
          }
          inputMode={alfanumerico ? "text" : "numeric"}
          pattern={alfanumerico ? undefined : "\\d*"}
          autoComplete="off"
          ref={(el) => {
            refs.current.identificacion = el;
          }}
        />

        {/* Media columna: un calendario ocupa poco y a ancho completo se veía
            desproporcionado. El hueco de la derecha es donde caben el eco de la
            edad y la pista del tipo de documento sin apretar nada. */}
        <div>
          <CampoTexto
            nombre="fechaNacimiento"
            etiqueta="Fecha de nacimiento"
            type="date"
            value={v.fechaNacimiento}
            onChange={(e) => cambiarFecha(e.target.value)}
            onBlur={() => alSalir("fechaNacimiento")}
            error={errores.fechaNacimiento}
            min="1920-01-01"
            /* `hoy` está vacío hasta montar: sin `max` en el HTML del servidor,
               con `max` en cuanto hidrata. Cero desajuste. */
            max={hoy || undefined}
            autoComplete="bday"
            ref={(el) => {
              refs.current.fechaNacimiento = el;
            }}
          />
          {/* El eco convierte un 1926 tecleado por 1996 en algo que se ve, en
              vez de esconderlo en un `dd/mm/aaaa` diminuto. */}
          {anios !== null && (
            <p role="status" className="mt-1.5 text-xs text-verde-300">
              Nació el {fechaCompacta(v.fechaNacimiento)} ·{" "}
              <span className="tabular-nums">{anios} años</span>
              {esMenor && (
                <span className="text-[var(--color-estado-aviso)]">
                  {" "}
                  · Es menor de edad: añade los datos del acudiente.
                </span>
              )}
            </p>
          )}
          {/* Pista, no error: un menor extranjero lleva C.E., así que la lista
              no se filtra — solo se sugiere. */}
          {esMenor && !tipoTocado && v.tipoIdentificacion === "C.C." && (
            <p className="mt-1 text-xs text-verde-300">
              Si es menor, el documento suele ser T.I.
            </p>
          )}
        </div>
      </Seccion>

      <Seccion titulo="Contacto">
        <CampoTexto
          nombre="telefono"
          etiqueta="Teléfono"
          value={v.telefono}
          /* `normalizarTelefonoPegado` quita el 57 al pegar «+57 320 907 8814»:
             si no, saldrían 12 dígitos y un error incomprensible justo después
             de haber pegado un teléfono correcto. */
          onChange={(e) => set("telefono", normalizarTelefonoPegado(e.target.value))}
          onBlur={() => alSalir("telefono")}
          error={errores.telefono}
          inputMode="numeric"
          pattern="\d*"
          placeholder="3209078814"
          autoComplete="off"
          ref={(el) => {
            refs.current.telefono = el;
          }}
        />

        <CampoTexto
          nombre="correo"
          etiqueta="Correo electrónico (opcional)"
          type="email"
          value={v.correo}
          onChange={(e) => set("correo", e.target.value)}
          onBlur={() => alSalir("correo")}
          error={errores.correo}
          autoComplete="off"
          ref={(el) => {
            refs.current.correo = el;
          }}
        />
      </Seccion>

      <Seccion titulo="Salud y emergencia">
        <CampoSelect
          nombre="eps"
          etiqueta="EPS"
          value={v.eps}
          onChange={(e) => set("eps", e.target.value)}
          onBlur={() => alSalir("eps")}
          error={errores.eps}
          ref={(el) => {
            refs.current.eps = el;
          }}
        >
          <option value="">Elige la EPS…</option>
          {EPS.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </CampoSelect>

        {v.eps === EPS_OTRA && (
          <CampoTexto
            nombre="epsOtra"
            etiqueta="¿Cuál?"
            value={v.epsOtra}
            onChange={(e) => set("epsOtra", e.target.value)}
            onBlur={() => alSalir("epsOtra")}
            error={errores.epsOtra}
            maxLength={60}
            autoComplete="off"
            ref={(el) => {
              refs.current.epsOtra = el;
            }}
          />
        )}

        <CampoTexto
          nombre="emergenciaNombre"
          etiqueta="Contacto de emergencia"
          value={v.emergenciaNombre}
          onChange={(e) => set("emergenciaNombre", sinDigitos(e.target.value))}
          onBlur={() => alSalir("emergenciaNombre")}
          error={errores.emergenciaNombre}
          maxLength={80}
          autoComplete="off"
          ref={(el) => {
            refs.current.emergenciaNombre = el;
          }}
        />

        <CampoTexto
          nombre="emergenciaTelefono"
          etiqueta="Teléfono de emergencia"
          value={v.emergenciaTelefono}
          onChange={(e) =>
            set("emergenciaTelefono", normalizarTelefonoPegado(e.target.value))
          }
          onBlur={() => alSalir("emergenciaTelefono")}
          error={errores.emergenciaTelefono}
          aviso={avisos.emergenciaTelefono}
          inputMode="numeric"
          pattern="\d*"
          autoComplete="off"
          ref={(el) => {
            refs.current.emergenciaTelefono = el;
          }}
        />
      </Seccion>

      {/* Solo si es menor. Va DESPUÉS del contacto de emergencia a propósito:
          los «mismo que…» apuntan hacia arriba, y si este bloque fuera antes no
          significarían nada. */}
      {esMenor === true && (
        <Seccion titulo="Acudiente">
          <CampoTexto
            ancho
            nombre="tutorNombre"
            etiqueta="Nombre del acudiente"
            value={tutorNombre}
            onChange={(e) => set("tutorNombrePropio", sinDigitos(e.target.value))}
            onBlur={() => alSalir("tutorNombre")}
            error={errores.tutorNombre}
            /* `readOnly`, NO `disabled`: un campo deshabilitado sale del orden de
               tabulación y su valor desaparece del árbol de accesibilidad, así
               que quien usa lector no podría leer qué se ha copiado. */
            readOnly={v.mismoNombre}
            ayuda={
              v.mismoNombre ? "Se copia del contacto de emergencia." : undefined
            }
            maxLength={80}
            autoComplete="off"
            ref={(el) => {
              refs.current.tutorNombre = el;
            }}
          />
          <CampoCheck
            ancho
            nombre="mismoNombre"
            checked={v.mismoNombre}
            onChange={(b) => set("mismoNombre", b)}
          >
            Mismo nombre que el contacto de emergencia
          </CampoCheck>

          <CampoTexto
            nombre="tutorIdentificacion"
            etiqueta="Cédula del acudiente"
            value={v.tutorIdentificacion}
            onChange={(e) =>
              set(
                "tutorIdentificacion",
                soloDigitos(e.target.value).slice(0, DOC_MAX),
              )
            }
            onBlur={() => alSalir("tutorIdentificacion")}
            error={errores.tutorIdentificacion}
            inputMode="numeric"
            pattern="\d*"
            autoComplete="off"
            ref={(el) => {
              refs.current.tutorIdentificacion = el;
            }}
          />

          <div>
            <CampoTexto
              nombre="tutorTelefono"
              etiqueta="Teléfono del acudiente"
              value={tutorTelefono}
              onChange={(e) =>
                set("tutorTelefonoPropio", normalizarTelefonoPegado(e.target.value))
              }
              onBlur={() => alSalir("tutorTelefono")}
              error={errores.tutorTelefono}
              readOnly={v.mismoTelefono}
              ayuda={
                v.mismoTelefono
                  ? "Se copia del contacto de emergencia."
                  : undefined
              }
              inputMode="numeric"
              pattern="\d*"
              autoComplete="off"
              ref={(el) => {
                refs.current.tutorTelefono = el;
              }}
            />
            <CampoCheck
              nombre="mismoTelefono"
              checked={v.mismoTelefono}
              onChange={(b) => set("mismoTelefono", b)}
            >
              Mismo número que el contacto de emergencia
            </CampoCheck>
          </div>
        </Seccion>
      )}

      <div className="rounded-2xl border border-beige bg-white p-5 shadow-card sm:p-6">
        <CampoCheck
          nombre="terminos"
          checked={v.terminos}
          onChange={(b) => set("terminos", b)}
          error={errores.terminos}
        >
          {esMenor === true ? "El acudiente acepta los " : "El cliente acepta los "}
          {/* ⚠️ Un `<a>` dentro de un `<label>` NO marca la casilla al pulsarlo:
              el estándar excluye del comportamiento de la etiqueta los clics
              sobre contenido interactivo descendiente. No hace falta parar la
              propagación a mano — y no conviene «arreglarlo» luego.

              `target="_blank"` y no `download`: así el formulario a medio llenar
              no se pierde, y desde el visor del PDF se puede guardar igual. */}
          <a
            href={URL_TERMINOS}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 underline underline-offset-4 hover:text-blue-900"
          >
            términos y condiciones
          </a>
          {esMenor === true
            ? " del estudio en nombre del menor."
            : " del estudio."}
        </CampoCheck>
      </div>

      {/* Pegada abajo: en móvil el formulario mide más de una pantalla, y
          «Guardar» al final de un scroll largo es donde se pierde la gente. */}
      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-beige bg-arena/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Link
          href="/admin/usuarios"
          className="control-fx relative inline-flex min-h-[44px] items-center overflow-hidden rounded-full px-5 text-sm text-verde-700 transition-colors duration-300 hover:text-verde"
        >
          <span className="control-sheen" aria-hidden="true" />
          Cancelar
        </Link>
        <button
          type="submit"
          className="control-fx relative inline-flex min-h-[44px] items-center gap-2 overflow-hidden rounded-full bg-verde px-6 text-sm text-arena transition-colors duration-300 hover:bg-verde-700"
        >
          <span className="control-sheen" aria-hidden="true" />
          Guardar cliente
        </button>
      </div>
    </form>
  );
}
