"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import TextField from "@/components/auth/TextField";
import BotonVerContrasena from "@/components/auth/BotonVerContrasena";
import { Button } from "@/components/ui/Button";
import { URL_TERMINOS } from "@/lib/admin/catalogos";
import { registrarCliente } from "@/lib/cliente/acciones";
import {
  DIRECCION_MAX,
  TIPOS_REGISTRO,
  erroresRegistro,
  esMenorDeEdad,
  type CampoRegistro,
  type FichaRegistro,
  type TipoRegistro,
} from "@/lib/cliente/registro";
import {
  hoyLocalIso,
  nombrePropio,
  normalizarTelefonoPegado,
  sinDigitos,
  soloAlfanumerico,
  soloDigitos,
} from "@/lib/validacion";

/** `confirm` es solo del navegador: el servidor no recibe la repetición. */
type Campo = CampoRegistro | "confirm";
type Errores = Partial<Record<Campo, string>>;

/**
 * Los tres pasos, con los campos de cada uno EN ORDEN de pantalla.
 *
 * Por pasos para que el registro no se vea largo (decisión del usuario): son
 * trece campos, y de un tirón en el móvil eran varias pantallas de scroll.
 * Se agrupan por lo que se le pregunta a la persona, no por tamaño: quién
 * eres · a quién llamamos · cómo entras. El correo va en «Tu cuenta» porque
 * es el usuario con el que entrará.
 */
const PASOS: { corto: string; titulo: string; nota: string; campos: Campo[] }[] = [
  {
    corto: "Tus datos",
    titulo: "Tus datos",
    nota: "Para tu ficha en el estudio.",
    campos: ["nombre", "identificacion", "fechaNacimiento", "telefono", "direccion"],
  },
  {
    corto: "Emergencia",
    titulo: "Contacto de emergencia",
    nota: "A quién llamamos si te pasa algo en clase.",
    campos: [
      "emergenciaNombre",
      "emergenciaTelefono",
      "acudienteNombre",
      "acudienteIdentificacion",
      "acudienteTelefono",
    ],
  },
  {
    corto: "Tu cuenta",
    titulo: "Tu cuenta",
    nota: "Entrarás con tu correo y esta contraseña.",
    campos: ["correo", "contrasena", "confirm", "aceptaTerminos"],
  },
];
const ULTIMO = PASOS.length - 1;

function pasoDe(campo: Campo): number {
  return PASOS.findIndex((p) => p.campos.includes(campo));
}

/** Id del control de cada campo, para llevarle el foco. */
const ID_DE: Record<Campo, string> = {
  nombre: "nombre",
  identificacion: "identificacion",
  fechaNacimiento: "nacimiento",
  correo: "email",
  telefono: "telefono",
  direccion: "direccion",
  emergenciaNombre: "emergencia-nombre",
  emergenciaTelefono: "emergencia-telefono",
  acudienteNombre: "acudiente-nombre",
  acudienteIdentificacion: "acudiente-documento",
  acudienteTelefono: "acudiente-telefono",
  contrasena: "password",
  confirm: "confirm",
  aceptaTerminos: "terminos",
};

const INICIAL = {
  nombre: "",
  tipo: "C.C." as TipoRegistro,
  identificacion: "",
  fechaNacimiento: "",
  correo: "",
  telefono: "",
  direccion: "",
  emergenciaNombre: "",
  emergenciaTelefono: "",
  /** ⚠️ Valores PROPIOS del acudiente. Con la casilla marcada, el efectivo se
   *  DERIVA del contacto de emergencia en cada render (ver más abajo). */
  acudienteNombrePropio: "",
  acudienteIdentificacion: "",
  acudienteTelefonoPropio: "",
  acudienteEsEmergencia: false,
  contrasena: "",
  confirm: "",
  aceptaTerminos: false,
};
type Valores = typeof INICIAL;

/** Qué errores deja de tener sentido mostrar al cambiar cada valor. */
const LIMPIA: Partial<Record<keyof Valores, Campo[]>> = {
  tipo: ["identificacion"],
  // La edad cambia las reglas del documento, de la emergencia, del acudiente
  // y de quién acepta los términos.
  fechaNacimiento: [
    "fechaNacimiento",
    "identificacion",
    "emergenciaTelefono",
    "acudienteNombre",
    "acudienteIdentificacion",
    "acudienteTelefono",
    "aceptaTerminos",
  ],
  emergenciaNombre: ["emergenciaNombre", "acudienteNombre"],
  emergenciaTelefono: ["emergenciaTelefono", "acudienteTelefono"],
  acudienteNombrePropio: ["acudienteNombre"],
  acudienteTelefonoPropio: ["acudienteTelefono"],
  acudienteEsEmergencia: ["acudienteNombre", "acudienteTelefono"],
  contrasena: ["contrasena", "confirm"],
};

/* Referencias estables para `useSyncExternalStore` (ver `hoy` más abajo). */
const sinSuscripcion = () => () => {};
const enServidor = () => "";

/**
 * Registro de clientes, en tres pasos: crea la cuenta y la ficha («Sin
 * plan»), deja la sesión abierta y lleva a `/mi-cuenta`.
 *
 * Pide **todo lo que el estudio necesita de un cliente** (decisión del
 * usuario, oct 2026): documento, fecha de nacimiento, teléfono, dirección y
 * contacto de emergencia.
 *
 * ⚠️ **Los menores ya pueden registrarse**, y el bloque del acudiente aparece
 * SOLO: la minoría de edad se deriva de la fecha de nacimiento, no se
 * pregunta (misma doctrina que el alta del panel). Entonces quien acepta los
 * términos es el acudiente, y la casilla lo dice con esas palabras.
 *
 * «Siguiente» valida solo el paso en pantalla; «Crear mi cuenta» vuelve a
 * validarlo todo y, si algo de un paso anterior falla, vuelve a ese paso.
 * Las reglas están en `lib/cliente/registro.ts`, compartidas con el servidor,
 * que lo vuelve a validar todo y decide la edad con la fecha de Bogotá.
 *
 * ⚠️ Una cédula que ya está en el estudio NO se enlaza: ver `registrarCliente`.
 */
export default function RegistroPage() {
  const router = useRouter();
  const [paso, setPaso] = useState(0);
  const [showPass, setShowPass] = useState(false);
  const [v, setV] = useState<Valores>(INICIAL);
  const [errors, setErrors] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [enviando, iniciar] = useTransition();
  /* Contra robots: el campo trampa (nadie lo ve ni lo alcanza con el
     teclado) y cuándo se abrió el formulario. Un robot lo rellena todo y
     envía al instante. */
  const [trampa, setTrampa] = useState("");
  const abierto = useRef(0);
  useEffect(() => {
    abierto.current = Date.now();
  }, []);

  /* A dónde llevar el foco DESPUÉS del render: al cambiar de paso, el
     control todavía no existe cuando se decide. */
  const focoPendiente = useRef<string | null>(null);
  useEffect(() => {
    const id = focoPendiente.current;
    if (!id) return;
    focoPendiente.current = null;
    const el = document.getElementById(id);
    if (!el) return;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: quieto ? "auto" : "smooth" });
    el.focus({ preventScroll: true });
  });

  /**
   * La fecha de hoy, **solo en el cliente**. La página se prerenderiza: un
   * `new Date()` en el cuerpo quedaría congelado con la fecha del build (y
   * desajuste de hidratación). Mismo montaje que el alta del panel.
   */
  const hoy = useSyncExternalStore(sinSuscripcion, hoyLocalIso, enServidor);
  /** `null` = aún no se sabe: sin fecha no se pinta ni se da por sobrante el
   *  bloque del acudiente. */
  const menor = esMenorDeEdad(v.fechaNacimiento, hoy);

  /* Espejos DERIVADOS: si se copiaran una vez al marcar la casilla, corregir
     luego el contacto de emergencia dejaría el del acudiente obsoleto. */
  const acudienteNombre = v.acudienteEsEmergencia ? v.emergenciaNombre : v.acudienteNombrePropio;
  const acudienteTelefono = v.acudienteEsEmergencia ? v.emergenciaTelefono : v.acudienteTelefonoPropio;

  function set<K extends keyof Valores>(key: K, value: Valores[K]) {
    setV((x) => ({ ...x, [key]: value }));
    const campos = LIMPIA[key] ?? (key in ID_DE ? [key as Campo] : []);
    if (campos.length > 0) {
      setErrors((e) => {
        const n = { ...e };
        for (const c of campos) delete n[c];
        return n;
      });
    }
  }

  function ficha(): FichaRegistro {
    return {
      nombre: v.nombre,
      tipoIdentificacion: v.tipo,
      identificacion: v.identificacion,
      fechaNacimiento: v.fechaNacimiento,
      correo: v.correo,
      telefono: v.telefono,
      direccion: v.direccion,
      emergenciaNombre: v.emergenciaNombre,
      emergenciaTelefono: v.emergenciaTelefono,
      acudiente: {
        nombre: acudienteNombre,
        identificacion: v.acudienteIdentificacion,
        telefono: acudienteTelefono,
      },
      contrasena: v.contrasena,
      aceptaTerminos: v.aceptaTerminos,
    };
  }

  function todosLosErrores(): Errores {
    const e: Errores = erroresRegistro(ficha(), hoy);
    if (v.confirm !== v.contrasena) e.confirm = "Las contraseñas no coinciden.";
    return e;
  }

  /** Marca los errores, vuelve al paso del primero y le lleva el foco. Todos
   *  los del paso se marcan a la vez: de uno en uno sería un goteo. */
  function mostrar(e: Errores) {
    const orden = PASOS.flatMap((p) => p.campos);
    const primero = orden.find((c) => e[c]);
    if (!primero) return;
    const destino = pasoDe(primero);
    setErrors(Object.fromEntries(Object.entries(e).filter(([c]) => pasoDe(c as Campo) === destino)));
    setPaso(destino);
    focoPendiente.current = ID_DE[primero];
  }

  function irA(n: number) {
    setErrors({});
    setErrorGeneral("");
    setPaso(n);
    focoPendiente.current = "paso-titulo";
  }

  function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setErrorGeneral("");
    const e = todosLosErrores();

    // Pasos intermedios: solo cuenta lo que hay en pantalla.
    if (paso < ULTIMO) {
      const delPaso = PASOS[paso].campos.filter((c) => e[c]);
      if (delPaso.length > 0) mostrar(Object.fromEntries(delPaso.map((c) => [c, e[c]])));
      else irA(paso + 1);
      return;
    }

    if (Object.keys(e).length > 0) {
      mostrar(e);
      return;
    }

    iniciar(async () => {
      const r = await registrarCliente({
        ...ficha(),
        trampa,
        msAbierto: Date.now() - abierto.current,
      });
      if (r.ok) {
        // La sesión ya está abierta: directo a su área.
        router.push("/mi-cuenta");
        router.refresh();
        return;
      }
      if (r.campo && r.campo in ID_DE) mostrar({ [r.campo]: r.error });
      else setErrorGeneral(r.error);
    });
  }

  const alfanumerico = v.tipo === "Pasaporte";
  // Como se guardará: «laura» se lee «Laura» en la casilla de términos.
  const nombreCorto = nombrePropio(v.nombre).split(" ")[0];
  const actual = PASOS[paso];

  return (
    <AuthShell
      headline="Empieza tu camino con Reforme."
      tagline="Crea tu cuenta para reservar tus clases y gestionar tu práctica con nosotros."
    >
      <div className="mb-8 text-center lg:text-left">
        <p className="eyebrow text-dorado-tinta">Crear cuenta</p>
        <h1 className="mt-3 font-display text-4xl text-verde">Únete a Reforme</h1>
        <p className="mt-2 text-verde-700">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="font-medium text-dorado-tinta underline-offset-4 hover:underline"
          >
            Inicia sesión
          </Link>
        </p>
      </div>

      <IndicadorPasos actual={paso} />

      <form onSubmit={onSubmit} className="mt-8" noValidate>
        {/* Campo trampa: fuera de la pantalla, sin tabulación y oculto a los
            lectores de pantalla. Si llega con texto, el servidor no registra. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="sitio-web">No rellenes este campo</label>
          <input
            id="sitio-web"
            name="sitio-web"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={trampa}
            onChange={(e) => setTrampa(e.target.value)}
          />
        </div>

        {/* `key`: cada paso entra con su animación. El título recibe el foco
            al cambiar de paso, así el lector anuncia dónde se está. */}
        <section key={paso} aria-labelledby="paso-titulo" className="animate-rise space-y-5">
          <div>
            <h2
              id="paso-titulo"
              tabIndex={-1}
              className="font-display text-2xl text-verde focus:outline-none"
            >
              {actual.titulo}
            </h2>
            <p className="mt-1 text-sm text-verde-700">{actual.nota}</p>
          </div>

          {paso === 0 && (
            <>
              <TextField
                id="nombre"
                label="Nombre completo"
                type="text"
                required
                autoComplete="name"
                placeholder="Nombre y apellido"
                value={v.nombre}
                onChange={(e) => set("nombre", sinDigitos(e.target.value))}
                error={errors.nombre}
              />

              {/* 14rem = «Cédula de ciudadanía» + padding + la flecha. Con los
                  11rem de antes el texto se metía bajo la flecha nativa. */}
              <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_1fr]">
                <div>
                  <label htmlFor="tipo" className="mb-1.5 block text-sm font-medium tracking-wide text-verde">
                    Documento
                  </label>
                  {/* Flecha propia con `appearance-none` + `pr-10`: la nativa no
                      deja reservarle sitio y cada navegador la pinta a su manera. */}
                  <div className="relative">
                    <select
                      id="tipo"
                      required
                      value={v.tipo}
                      onChange={(e) => {
                        set("tipo", e.target.value as TipoRegistro);
                        set("identificacion", "");
                      }}
                      className="w-full appearance-none truncate rounded-xl border border-beige bg-white/60 py-3 pl-4 pr-10 text-verde transition-all duration-300 hover:border-dorado/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-dorado/60"
                    >
                      {TIPOS_REGISTRO.map((t) => (
                        <option key={t.valor} value={t.valor}>
                          {t.texto}
                        </option>
                      ))}
                    </select>
                    <Chevron />
                  </div>
                </div>
                <TextField
                  id="identificacion"
                  label="Número"
                  required
                  /* Nunca `type="number"`: pierde ceros iniciales y deja
                     escribir «e». Se filtra al teclear. */
                  type="text"
                  inputMode={alfanumerico ? "text" : "numeric"}
                  autoComplete="off"
                  placeholder={alfanumerico ? "AB123456" : "1045678912"}
                  value={v.identificacion}
                  onChange={(e) =>
                    set(
                      "identificacion",
                      alfanumerico
                        ? soloAlfanumerico(e.target.value).toUpperCase().slice(0, 15)
                        : soloDigitos(e.target.value).slice(0, 12),
                    )
                  }
                  error={errors.identificacion}
                />
              </div>

              <div>
                <TextField
                  id="nacimiento"
                  label="Fecha de nacimiento"
                  type="date"
                  required
                  autoComplete="bday"
                  min="1900-01-01"
                  max={hoy || undefined}
                  value={v.fechaNacimiento}
                  onChange={(e) => set("fechaNacimiento", e.target.value)}
                  error={errors.fechaNacimiento}
                />
                <p aria-live="polite" className="mt-1.5 text-xs text-dorado-tinta">
                  {menor === true &&
                    "Eres menor de edad: en el siguiente paso te pedimos los datos de tu acudiente."}
                </p>
              </div>

              <TextField
                id="telefono"
                label="Teléfono"
                type="tel"
                required
                inputMode="numeric"
                autoComplete="tel"
                placeholder="320 000 0000"
                value={v.telefono}
                // Pegar «+57 320 907 8814» funciona: se queda con los 10 dígitos.
                onChange={(e) => set("telefono", normalizarTelefonoPegado(e.target.value))}
                error={errors.telefono}
              />

              <TextField
                id="direccion"
                label="Dirección de residencia"
                type="text"
                required
                autoComplete="street-address"
                maxLength={DIRECCION_MAX}
                placeholder="Cra 1 #27-50, barrio Centro"
                value={v.direccion}
                onChange={(e) => set("direccion", e.target.value)}
                error={errors.direccion}
              />
            </>
          )}

          {paso === 1 && (
            <>
              {/* `autoComplete="off"`: son los datos de OTRA persona, y el
                  navegador rellenaría los tuyos. */}
              <TextField
                id="emergencia-nombre"
                label="Nombre completo"
                type="text"
                required
                autoComplete="off"
                placeholder="Nombre y apellido"
                value={v.emergenciaNombre}
                onChange={(e) => set("emergenciaNombre", sinDigitos(e.target.value))}
                error={errors.emergenciaNombre}
              />
              <TextField
                id="emergencia-telefono"
                label="Teléfono"
                type="tel"
                required
                inputMode="numeric"
                autoComplete="off"
                placeholder="320 000 0000"
                value={v.emergenciaTelefono}
                onChange={(e) => set("emergenciaTelefono", normalizarTelefonoPegado(e.target.value))}
                error={errors.emergenciaTelefono}
              />

              {menor === true && (
                <section
                  aria-labelledby="acudiente-titulo"
                  className="space-y-5 rounded-2xl border border-dorado/60 bg-dorado/5 p-5"
                >
                  <div>
                    <h3 id="acudiente-titulo" className="font-display text-xl text-verde">
                      Tu acudiente
                    </h3>
                    <p className="mt-1 text-sm text-verde-700">
                      Como eres menor de edad, un adulto responsable tiene que autorizar tu registro.
                    </p>
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 text-sm text-verde-700">
                    <input
                      type="checkbox"
                      checked={v.acudienteEsEmergencia}
                      onChange={(e) => set("acudienteEsEmergencia", e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-verde"
                    />
                    <span>Mi acudiente es mi contacto de emergencia</span>
                  </label>

                  {/* Los espejos van `readOnly`, no `disabled`: deshabilitado
                      saldría del tabulador y su valor no llegaría al lector. */}
                  <TextField
                    id="acudiente-nombre"
                    label="Nombre completo del acudiente"
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="Nombre y apellido"
                    readOnly={v.acudienteEsEmergencia}
                    value={acudienteNombre}
                    onChange={(e) => set("acudienteNombrePropio", sinDigitos(e.target.value))}
                    error={errors.acudienteNombre}
                  />
                  <TextField
                    id="acudiente-documento"
                    label="Cédula del acudiente"
                    type="text"
                    required
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="1045678912"
                    value={v.acudienteIdentificacion}
                    onChange={(e) => set("acudienteIdentificacion", soloDigitos(e.target.value).slice(0, 12))}
                    error={errors.acudienteIdentificacion}
                  />
                  <TextField
                    id="acudiente-telefono"
                    label="Teléfono del acudiente"
                    type="tel"
                    required
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="320 000 0000"
                    readOnly={v.acudienteEsEmergencia}
                    value={acudienteTelefono}
                    onChange={(e) => set("acudienteTelefonoPropio", normalizarTelefonoPegado(e.target.value))}
                    error={errors.acudienteTelefono}
                  />
                </section>
              )}
            </>
          )}

          {paso === 2 && (
            <>
              <TextField
                id="email"
                label="Correo electrónico"
                type="email"
                required
                autoComplete="email"
                placeholder="tu@correo.com"
                value={v.correo}
                onChange={(e) => set("correo", e.target.value)}
                error={errors.correo}
              />
              <TextField
                id="password"
                label="Contraseña"
                type={showPass ? "text" : "password"}
                required
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                value={v.contrasena}
                onChange={(e) => set("contrasena", e.target.value)}
                error={errors.contrasena}
                accesorio={
                  <BotonVerContrasena
                    visible={showPass}
                    onToggle={() => setShowPass((x) => !x)}
                    campo="password"
                  />
                }
              />
              <TextField
                id="confirm"
                label="Confirmar contraseña"
                type={showPass ? "text" : "password"}
                required
                autoComplete="new-password"
                placeholder="Repite tu contraseña"
                value={v.confirm}
                onChange={(e) => set("confirm", e.target.value)}
                error={errors.confirm}
              />

              <div>
                <label className="flex cursor-pointer items-start gap-3 text-sm text-verde-700">
                  <input
                    id="terminos"
                    type="checkbox"
                    checked={v.aceptaTerminos}
                    onChange={(e) => set("aceptaTerminos", e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-verde"
                  />
                  {/* Si es menor, firma el acudiente: la casilla lo dice con
                      esas palabras para que quede claro quién acepta. */}
                  <span>
                    {menor === true ? (
                      <>
                        Soy el acudiente de {nombreCorto || "este menor"}: autorizo su registro y acepto
                        los <EnlaceTerminos /> del estudio en su nombre.
                      </>
                    ) : (
                      <>
                        Acepto los <EnlaceTerminos /> del estudio.
                      </>
                    )}
                  </span>
                </label>
                {errors.aceptaTerminos && (
                  <p className="mt-1.5 text-xs text-error">{errors.aceptaTerminos}</p>
                )}
              </div>
            </>
          )}
        </section>

        {errorGeneral && (
          <p role="alert" className="mt-6 rounded-xl border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
            {errorGeneral}
          </p>
        )}

        {/* «Atrás» a la izquierda y la acción que avanza a la derecha, como en
            cualquier asistente. En móvil se apilan: la principal arriba, a
            ancho completo, que es la que se pulsa con el pulgar. */}
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          {paso > 0 && (
            <button
              type="button"
              onClick={() => irA(paso - 1)}
              disabled={enviando}
              className="min-h-[44px] rounded-full px-6 text-sm font-semibold tracking-wide text-verde-700 transition-colors hover:text-dorado-tinta disabled:opacity-50"
            >
              ← Atrás
            </button>
          )}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full sm:ml-auto sm:w-auto sm:min-w-[14rem]"
            sheen={false}
            disabled={enviando}
          >
            {paso < ULTIMO ? "Siguiente" : enviando ? "Creando tu cuenta…" : "Crear mi cuenta"}
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}

/**
 * «Paso 2 de 3» con una barra por paso. No es navegable: saltar hacia
 * delante dejaría pasos sin validar, y hacia atrás ya está «← Atrás».
 * Lista ordenada con `aria-current="step"` para el lector de pantalla.
 */
function IndicadorPasos({ actual }: { actual: number }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-verde-300">
        Paso {actual + 1} de {PASOS.length}
      </p>
      <ol className="mt-3 grid grid-cols-3 gap-2">
        {PASOS.map((p, i) => (
          <li key={p.corto} aria-current={i === actual ? "step" : undefined}>
            <span
              aria-hidden="true"
              className={`block h-1 rounded-full transition-colors duration-500 ${
                i <= actual ? "bg-dorado" : "bg-beige"
              }`}
            />
            <span
              className={`mt-2 block text-xs ${
                i === actual ? "font-semibold text-verde" : i < actual ? "text-verde-700" : "text-verde-300"
              }`}
            >
              {i < actual && <span aria-hidden="true">✓ </span>}
              {p.corto}
              {i < actual && <span className="sr-only"> (hecho)</span>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* El mismo PDF que enlaza el alta de cliente del panel. Pestaña nueva: así no
   se pierde el formulario a medio llenar. Dentro del `<label>` no marca la
   casilla: el estándar excluye los clics sobre contenido interactivo. */
function EnlaceTerminos() {
  return (
    <a
      href={URL_TERMINOS}
      target="_blank"
      rel="noopener noreferrer"
      className="text-dorado-tinta underline-offset-4 hover:underline"
    >
      términos y condiciones
    </a>
  );
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-verde-300"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
