"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import TextField from "@/components/auth/TextField";
import { Button } from "@/components/ui/Button";
import { URL_TERMINOS } from "@/lib/admin/catalogos";
import { registrarCliente } from "@/lib/cliente/acciones";
import {
  esCorreo,
  esMovilCO,
  normalizarTelefonoPegado,
  sinDigitos,
  soloAlfanumerico,
  soloDigitos,
} from "@/lib/validacion";

type Campo =
  | "nombre"
  | "identificacion"
  | "email"
  | "telefono"
  | "password"
  | "confirm"
  | "terms";
type Errors = Partial<Record<Campo, string>>;

/* Los tipos que una persona adulta usa para registrarse sola. La T.I. y el
   R.C. son de menores, que se dan de alta en recepción con su acudiente. */
const TIPOS = [
  { valor: "C.C.", texto: "Cédula de ciudadanía" },
  { valor: "C.E.", texto: "Cédula de extranjería" },
  { valor: "Pasaporte", texto: "Pasaporte" },
] as const;

/** El campo del servidor → el del formulario (los nombres no coinciden). */
const CAMPO_DE: Record<string, Campo> = {
  nombre: "nombre",
  identificacion: "identificacion",
  correo: "email",
  telefono: "telefono",
  contrasena: "password",
  terminos: "terms",
};

/**
 * Registro de clientes: crea la cuenta y la ficha («Sin plan»), deja la sesión
 * abierta y lleva a `/mi-cuenta`. Real desde oct 2026 (paso 10); antes solo
 * validaba.
 *
 * ⚠️ **Pide el documento** aunque antes no lo hacía: es lo que identifica a un
 * cliente en recepción, la ficha no se puede crear sin él, y es lo que impide
 * que alguien ya registrado en el estudio se cree una segunda ficha. Si ese
 * documento ya existe, el registro NO lo enlaza: ver `registrarCliente`.
 *
 * Sigue validando en el navegador (para avisar al momento) y el servidor lo
 * vuelve a validar todo (para no fiarse del navegador).
 */
export default function RegistroPage() {
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);
  const [values, setValues] = useState({
    nombre: "",
    tipo: "C.C." as (typeof TIPOS)[number]["valor"],
    identificacion: "",
    email: "",
    telefono: "",
    password: "",
    confirm: "",
    terms: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [enviando, iniciar] = useTransition();

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key === "tipo" ? "identificacion" : key]: undefined }));
  }

  function validate(): Errors {
    const e: Errors = {};
    if (values.nombre.trim().length < 3) e.nombre = "Escribe tu nombre completo.";
    if (values.identificacion.length < 4) e.identificacion = "Escribe tu número de documento.";
    if (!esCorreo(values.email)) e.email = "Introduce un correo válido.";
    /* El teléfono es OPCIONAL: se valida solo si lo han escrito. Sirve para
       avisar de cambios de horario, no es un requisito para abrir cuenta. */
    if (values.telefono && !esMovilCO(values.telefono))
      e.telefono = "Un móvil colombiano son 10 dígitos y empieza por 3.";
    if (values.password.length < 8) e.password = "Mínimo 8 caracteres.";
    if (values.confirm !== values.password) e.confirm = "Las contraseñas no coinciden.";
    if (!values.terms) e.terms = "Debes aceptar los términos para continuar.";
    return e;
  }

  function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    setErrorGeneral("");
    if (Object.keys(e).length > 0) return;

    iniciar(async () => {
      const r = await registrarCliente({
        nombre: values.nombre,
        tipoIdentificacion: values.tipo,
        identificacion: values.identificacion,
        correo: values.email,
        telefono: values.telefono,
        contrasena: values.password,
        aceptaTerminos: values.terms,
      });
      if (r.ok) {
        // La sesión ya está abierta: directo a su área.
        router.push("/mi-cuenta");
        router.refresh();
        return;
      }
      const campo = r.campo ? CAMPO_DE[r.campo] : undefined;
      if (campo) setErrors((x) => ({ ...x, [campo]: r.error }));
      else setErrorGeneral(r.error);
    });
  }

  const alfanumerico = values.tipo === "Pasaporte";

  return (
    <AuthShell
      headline="Empieza tu camino con Reforme."
      tagline="Crea tu cuenta para reservar tus clases y gestionar tu práctica con nosotros."
    >
      <div className="mb-8 text-center lg:text-left">
        <p className="eyebrow text-dorado-dark">Crear cuenta</p>
        <h1 className="mt-3 font-display text-4xl text-verde">Únete a Reforme</h1>
        <p className="mt-2 text-verde-700">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="font-medium text-dorado-dark underline-offset-4 hover:underline"
          >
            Inicia sesión
          </Link>
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <TextField
          id="nombre"
          label="Nombre completo"
          type="text"
          autoComplete="name"
          placeholder="Tu nombre"
          value={values.nombre}
          onChange={(e) => set("nombre", sinDigitos(e.target.value))}
          error={errors.nombre}
        />

        <div className="grid gap-3 sm:grid-cols-[minmax(0,11rem)_1fr]">
          <div>
            <label htmlFor="tipo" className="mb-1.5 block text-sm font-medium tracking-wide text-verde">
              Documento
            </label>
            <select
              id="tipo"
              value={values.tipo}
              onChange={(e) => {
                set("tipo", e.target.value as (typeof TIPOS)[number]["valor"]);
                set("identificacion", "");
              }}
              className="w-full rounded-xl border border-beige bg-white/60 px-4 py-3 text-verde transition-all duration-300 hover:border-dorado/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-dorado/60"
            >
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.texto}
                </option>
              ))}
            </select>
          </div>
          <TextField
            id="identificacion"
            label="Número"
            /* Nunca `type="number"`: pierde ceros iniciales y deja escribir «e».
               Se filtra al teclear: el error «solo números» no puede existir. */
            type="text"
            inputMode={alfanumerico ? "text" : "numeric"}
            autoComplete="off"
            placeholder={alfanumerico ? "AB123456" : "1045678912"}
            value={values.identificacion}
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

        <TextField
          id="email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
          error={errors.email}
        />

        <TextField
          id="telefono"
          label="Teléfono (opcional)"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="320 000 0000"
          value={values.telefono}
          // Pegar «+57 320 907 8814» funciona: se queda con los 10 dígitos.
          onChange={(e) => set("telefono", normalizarTelefonoPegado(e.target.value))}
          error={errors.telefono}
        />

        <TextField
          id="password"
          label="Contraseña"
          type={showPass ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          value={values.password}
          onChange={(e) => set("password", e.target.value)}
          error={errors.password}
          hint={
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="text-xs text-verde-300 transition-colors hover:text-dorado-dark"
            >
              {showPass ? "Ocultar" : "Mostrar"}
            </button>
          }
        />

        <TextField
          id="confirm"
          label="Confirmar contraseña"
          type={showPass ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Repite tu contraseña"
          value={values.confirm}
          onChange={(e) => set("confirm", e.target.value)}
          error={errors.confirm}
        />

        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-verde-700">
            <input
              type="checkbox"
              checked={values.terms}
              onChange={(e) => set("terms", e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-verde"
            />
            <span>
              Acepto los{" "}
              {/* El mismo PDF que enlaza el alta de cliente del panel. Pestaña
                  nueva: así no se pierde el formulario a medio llenar. */}
              <a
                href={URL_TERMINOS}
                target="_blank"
                rel="noopener noreferrer"
                className="text-dorado-dark underline-offset-4 hover:underline"
              >
                términos y condiciones
              </a>{" "}
              del estudio.
            </span>
          </label>
          {errors.terms && <p className="mt-1.5 text-xs text-red-600">{errors.terms}</p>}
        </div>

        {errorGeneral && (
          <p role="alert" className="rounded-xl border border-red-400/50 bg-red-50/70 px-4 py-3 text-sm text-red-700">
            {errorGeneral}
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={enviando}>
          {enviando ? "Creando tu cuenta…" : "Crear mi cuenta"}
        </Button>
      </form>
    </AuthShell>
  );
}
