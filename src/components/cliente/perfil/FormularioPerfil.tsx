"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { cambiarMiContrasena } from "@/lib/admin/acciones";
import { EPS, EPS_OTRA } from "@/lib/admin/catalogos";
import { guardarMisDatos } from "@/lib/cliente/acciones";
import { CAMPOS_PERFIL, erroresPerfil, hayCambios, type ErroresPerfil, type MisDatosEditables } from "@/lib/cliente/perfil";
import { normalizarTelefonoPegado, soloDigitos } from "@/lib/validacion";

const ETIQUETA = "mb-1.5 block text-xs font-bold uppercase tracking-wider text-verde-300";
const CAMPO =
  "min-h-[52px] w-full rounded-2xl border bg-white px-4 text-verde transition-colors duration-300 placeholder:text-verde-300/70 focus:outline-none focus:ring-2 focus:ring-dorado/25";
const BORDE_OK = "border-beige hover:border-dorado/60 focus:border-dorado";
const BORDE_ERROR = "border-error focus:border-error";

/** Un dato que el cliente no puede cambiar: se lee (y se puede copiar), con
 *  un candado. `readOnly` y no `disabled`: un campo deshabilitado sale del
 *  orden de tabulación y del árbol de accesibilidad. */
function Bloqueado({ id, etiqueta, valor }: { id: string; etiqueta: string; valor: string }) {
  return (
    <div>
      <label htmlFor={id} className={ETIQUETA}>
        {etiqueta}
      </label>
      <div className="relative">
        <input
          id={id}
          readOnly
          value={valor}
          aria-describedby="lo-corrige-el-estudio"
          className="min-h-[52px] w-full truncate rounded-2xl border border-beige bg-arena/70 py-3 pl-4 pr-11 text-verde-700 focus:outline-none focus:ring-2 focus:ring-dorado/25"
        />
        <svg
          className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-verde-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </div>
    </div>
  );
}

function Campo({
  id,
  etiqueta,
  error,
  className = "",
  children,
}: {
  id: string;
  etiqueta: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className={ETIQUETA}>
        {etiqueta}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}

function Seccion({ titulo, descripcion, children }: { titulo: string; descripcion: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-beige py-7 first:border-t-0 first:pt-0">
      <h2 className="text-lg font-bold text-verde">{titulo}</h2>
      <div className="mt-1 space-y-1 text-sm text-verde-700">{descripcion}</div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** La EPS guardada → el `<select>` y, si no está en la lista, «Otra» + texto. */
function epsInicial(eps: string): { opcion: string; otra: string } {
  if (!eps) return { opcion: "", otra: "" };
  if ((EPS as readonly string[]).includes(eps) && eps !== EPS_OTRA) return { opcion: eps, otra: "" };
  return { opcion: EPS_OTRA, otra: eps };
}

export type DatosBloqueados = {
  nombre: string;
  correo: string;
  documento: string;
  fechaNacimiento: string;
  acudiente: string | null;
};

/**
 * «Mi perfil» del cliente (nov 2026), con el formato de «Mi perfil» de DEMO
 * adminGym (decisión del usuario): «Datos personales» con los campos en dos
 * columnas —los que corrige el estudio, con candado; los de contacto,
 * editables— y «Seguridad» con la casilla «Cambiar contraseña». Al pie,
 * «Descartar» y «Guardar cambios», apagados mientras no cambie nada.
 *
 * Un solo «Guardar» para las dos cosas: primero los datos y luego la
 * contraseña. Si los datos fallan, la contraseña ni se intenta.
 */
export default function FormularioPerfil({
  bloqueados,
  inicial,
  menor,
  enlaceCorreccion,
}: {
  bloqueados: DatosBloqueados;
  inicial: MisDatosEditables;
  /** Si es menor de edad (decide si su teléfono puede ser el de emergencia). */
  menor: boolean | null;
  /** WhatsApp del estudio con «quiero corregir un dato» ya escrito. */
  enlaceCorreccion: string | null;
}) {
  const [base, setBase] = useState(inicial);
  const [v, setV] = useState(inicial);
  const [eps, setEps] = useState(() => epsInicial(inicial.eps));
  const [errores, setErrores] = useState<ErroresPerfil>({});
  const [conClave, setConClave] = useState(false);
  const [clave, setClave] = useState({ actual: "", nueva: "", repetida: "" });
  const [errorClave, setErrorClave] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [pendiente, iniciar] = useTransition();
  const formulario = useRef<HTMLFormElement>(null);

  const datos: MisDatosEditables = { ...v, eps: eps.opcion === EPS_OTRA ? eps.otra : eps.opcion };
  const cambiaronDatos = hayCambios(base, datos);
  const cambiaClave = conClave && (clave.actual !== "" || clave.nueva !== "" || clave.repetida !== "");
  const algoQueGuardar = cambiaronDatos || cambiaClave;
  // Descartar también deshace solo haber abierto «Cambiar contraseña».
  const algoQueDescartar = cambiaronDatos || conClave;

  function set<K extends keyof MisDatosEditables>(campo: K, valor: string) {
    setV((x) => ({ ...x, [campo]: valor }));
    // Premia pronto: al escribir se quita el error de ese campo.
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: undefined }));
    setAviso(null);
  }

  function descartar() {
    setV(base);
    setEps(epsInicial(base.eps));
    setErrores({});
    setConClave(false);
    setClave({ actual: "", nueva: "", repetida: "" });
    setErrorClave(null);
    setAviso(null);
  }

  function enfocar(id: string) {
    formulario.current?.querySelector<HTMLElement>(`#${id}`)?.focus();
  }

  function guardar() {
    setAviso(null);
    setErrorClave(null);
    const e = cambiaronDatos ? erroresPerfil(datos, menor) : {};
    setErrores(e);
    const primero = CAMPOS_PERFIL.find((c) => e[c]);
    if (primero) return enfocar(`perfil-${primero}`);

    if (cambiaClave) {
      const problema =
        !clave.actual
          ? "Escribe tu contraseña actual."
          : clave.nueva.length < 8
            ? "La contraseña nueva necesita al menos 8 caracteres."
            : clave.nueva !== clave.repetida
              ? "Las dos contraseñas nuevas no coinciden."
              : null;
      if (problema) {
        setErrorClave(problema);
        return enfocar(!clave.actual ? "clave-actual" : clave.nueva.length < 8 ? "clave-nueva" : "clave-repetida");
      }
    }

    iniciar(async () => {
      if (cambiaronDatos) {
        const r = await guardarMisDatos(datos);
        if (!r.ok) {
          if (r.campo) {
            setErrores({ [r.campo]: r.error });
            enfocar(`perfil-${r.campo}`);
          } else setAviso({ tipo: "error", texto: r.error });
          return;
        }
        setBase(datos);
      }
      if (cambiaClave) {
        const r = await cambiarMiContrasena(clave.actual, clave.nueva);
        if (!r.ok) {
          setErrorClave(r.error);
          setAviso({ tipo: "error", texto: cambiaronDatos ? "Tus datos se guardaron, pero la contraseña no." : r.error });
          return;
        }
        setConClave(false);
        setClave({ actual: "", nueva: "", repetida: "" });
      }
      setAviso({ tipo: "ok", texto: "Cambios guardados." });
    });
  }

  const tel = (campo: "telefono" | "emergenciaTelefono") => ({
    id: `perfil-${campo}`,
    type: "tel" as const,
    inputMode: "numeric" as const,
    autoComplete: campo === "telefono" ? "tel-national" : "off",
    maxLength: 10,
    value: v[campo],
    // Pegar «+57 300 111 2233» funciona: se quita el 57 y los espacios.
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      set(campo, (e.target.value.length > 10 ? normalizarTelefonoPegado(e.target.value) : soloDigitos(e.target.value)).slice(0, 10)),
    "aria-invalid": Boolean(errores[campo]) || undefined,
    "aria-describedby": errores[campo] ? `perfil-${campo}-error` : undefined,
    className: `${CAMPO} ${errores[campo] ? BORDE_ERROR : BORDE_OK} font-cifra`,
  });

  const texto = (campo: "direccion" | "emergenciaNombre", autoComplete: string) => ({
    id: `perfil-${campo}`,
    value: v[campo],
    autoComplete,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(campo, e.target.value),
    "aria-invalid": Boolean(errores[campo]) || undefined,
    "aria-describedby": errores[campo] ? `perfil-${campo}-error` : undefined,
    className: `${CAMPO} ${errores[campo] ? BORDE_ERROR : BORDE_OK}`,
  });

  return (
    <form
      ref={formulario}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (algoQueGuardar && !pendiente) guardar();
      }}
      className="rounded-3xl border border-beige bg-white p-5 shadow-soft sm:p-8"
    >
      <Seccion
        titulo="Datos personales"
        descripcion={
          <>
            <p>Tu información de contacto e identidad.</p>
            <p id="lo-corrige-el-estudio">
              Nombre, correo, documento, fecha de nacimiento{bloqueados.acudiente ? " y acudiente" : ""} los corrige
              el estudio.{" "}
              {enlaceCorreccion && (
                <a
                  href={enlaceCorreccion}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-dorado-tinta underline-offset-4 hover:underline"
                >
                  Pedir una corrección
                </a>
              )}
            </p>
          </>
        }
      >
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <Bloqueado id="perfil-nombre" etiqueta="Nombre completo" valor={bloqueados.nombre} />
          <Bloqueado id="perfil-correo" etiqueta="Correo" valor={bloqueados.correo} />

          <Campo id="perfil-telefono" etiqueta="Teléfono" error={errores.telefono}>
            <input {...tel("telefono")} />
          </Campo>
          <Bloqueado id="perfil-documento" etiqueta="Documento de identidad" valor={bloqueados.documento} />

          <Campo id="perfil-eps" etiqueta="EPS" error={errores.eps}>
            <select
              id="perfil-eps"
              value={eps.opcion}
              onChange={(e) => {
                setEps({ opcion: e.target.value, otra: "" });
                setAviso(null);
              }}
              aria-invalid={Boolean(errores.eps) || undefined}
              aria-describedby={errores.eps ? "perfil-eps-error" : undefined}
              className={`${CAMPO} ${errores.eps ? BORDE_ERROR : BORDE_OK}`}
            >
              <option value="">Sin EPS</option>
              {EPS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
            {eps.opcion === EPS_OTRA && (
              <input
                aria-label="Nombre de tu EPS"
                value={eps.otra}
                maxLength={80}
                onChange={(e) => {
                  setEps({ opcion: EPS_OTRA, otra: e.target.value });
                  setAviso(null);
                }}
                placeholder="¿Cuál?"
                className={`${CAMPO} ${BORDE_OK} mt-2`}
              />
            )}
          </Campo>
          <Bloqueado id="perfil-nacimiento" etiqueta="Fecha de nacimiento" valor={bloqueados.fechaNacimiento} />

          <Campo id="perfil-direccion" etiqueta="Dirección de residencia" error={errores.direccion} className="sm:col-span-2">
            <input {...texto("direccion", "street-address")} maxLength={200} />
          </Campo>

          <Campo id="perfil-emergenciaNombre" etiqueta="Contacto de emergencia (nombre)" error={errores.emergenciaNombre}>
            <input {...texto("emergenciaNombre", "off")} maxLength={80} />
          </Campo>
          <Campo id="perfil-emergenciaTelefono" etiqueta="Contacto de emergencia (teléfono)" error={errores.emergenciaTelefono}>
            <input {...tel("emergenciaTelefono")} />
          </Campo>

          {bloqueados.acudiente && (
            <div className="sm:col-span-2">
              <Bloqueado id="perfil-acudiente" etiqueta="Acudiente" valor={bloqueados.acudiente} />
            </div>
          )}
        </div>
      </Seccion>

      <Seccion titulo="Seguridad" descripcion={<p>Cambia tu contraseña de acceso.</p>}>
        <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-3 text-sm font-bold text-verde">
          <input
            type="checkbox"
            checked={conClave}
            onChange={(e) => {
              setConClave(e.target.checked);
              setErrorClave(null);
              setAviso(null);
              if (!e.target.checked) setClave({ actual: "", nueva: "", repetida: "" });
            }}
            className="size-5 accent-[var(--color-verde)]"
          />
          Cambiar contraseña
        </label>
        {conClave && (
          <div className="mt-4 grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <Campo id="clave-actual" etiqueta="Contraseña actual" className="sm:col-span-2">
              <input
                id="clave-actual"
                type="password"
                autoComplete="current-password"
                value={clave.actual}
                onChange={(e) => setClave((c) => ({ ...c, actual: e.target.value }))}
                className={`${CAMPO} ${BORDE_OK} sm:max-w-[calc(50%-0.75rem)]`}
              />
            </Campo>
            <Campo id="clave-nueva" etiqueta="Contraseña nueva">
              <input
                id="clave-nueva"
                type="password"
                autoComplete="new-password"
                value={clave.nueva}
                onChange={(e) => setClave((c) => ({ ...c, nueva: e.target.value }))}
                aria-describedby="clave-ayuda"
                className={`${CAMPO} ${BORDE_OK}`}
              />
            </Campo>
            <Campo id="clave-repetida" etiqueta="Repite la contraseña nueva">
              <input
                id="clave-repetida"
                type="password"
                autoComplete="new-password"
                value={clave.repetida}
                onChange={(e) => setClave((c) => ({ ...c, repetida: e.target.value }))}
                className={`${CAMPO} ${BORDE_OK}`}
              />
            </Campo>
            <p id="clave-ayuda" className="-mt-2 text-xs text-verde-300 sm:col-span-2">
              Al menos 8 caracteres.
            </p>
            {errorClave && (
              <p role="alert" className="text-sm text-error sm:col-span-2">
                {errorClave}
              </p>
            )}
          </div>
        )}
      </Seccion>

      <div className="flex flex-col-reverse items-stretch gap-3 border-t border-beige pt-6 sm:flex-row sm:items-center sm:justify-end">
        <p aria-live="polite" className="text-sm sm:mr-auto">
          {aviso && <span className={aviso.tipo === "ok" ? "text-[var(--color-estado-ok)]" : "text-error"}>{aviso.texto}</span>}
        </p>
        <button
          type="button"
          onClick={descartar}
          disabled={!algoQueDescartar || pendiente}
          className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-beige px-6 text-sm font-medium text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-beige"
        >
          Descartar
        </button>
        <button
          type="submit"
          disabled={!algoQueGuardar || pendiente}
          className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-verde px-6 text-sm font-bold text-arena transition-colors duration-300 hover:bg-verde-900 disabled:cursor-not-allowed disabled:bg-beige disabled:text-verde-300"
        >
          {pendiente ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
