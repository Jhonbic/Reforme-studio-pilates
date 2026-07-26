"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import TextField from "@/components/auth/TextField";
import { Button } from "@/components/ui/Button";
import { esCorreo } from "@/lib/validacion";

type Errors = Partial<Record<"nombre" | "email" | "password" | "confirm" | "terms", string>>;

export default function RegistroPage() {
  const [showPass, setShowPass] = useState(false);
  const [values, setValues] = useState({
    nombre: "",
    email: "",
    telefono: "",
    password: "",
    confirm: "",
    terms: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): Errors {
    const e: Errors = {};
    if (values.nombre.trim().length < 2) e.nombre = "Cuéntanos tu nombre.";
    if (!esCorreo(values.email))
      e.email = "Introduce un correo válido.";
    if (values.password.length < 8)
      e.password = "Mínimo 8 caracteres.";
    if (values.confirm !== values.password)
      e.confirm = "Las contraseñas no coinciden.";
    if (!values.terms) e.terms = "Debes aceptar los términos para continuar.";
    return e;
  }

  // Solo UI por ahora: validamos en cliente y mostramos confirmación.
  function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length === 0) setDone(true);
  }

  return (
    <AuthShell
      headline="Empieza tu camino con Reforme."
      tagline="Crea tu cuenta para reservar tus clases y gestionar tu práctica con nosotros."
    >
      {done ? (
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-dorado/15 text-3xl text-dorado-dark">
            ✦
          </div>
          <h1 className="mt-6 font-display text-3xl text-verde">
            ¡Gracias, {values.nombre.split(" ")[0] || "bienvenida"}!
          </h1>
          <p className="mt-3 text-verde-700">
            Hemos recibido tus datos. El registro aún no está conectado a
            nuestro sistema; muy pronto podrás activar tu cuenta y reservar tus
            clases.
          </p>
          <Link
            href="/"
            className="mt-8 inline-block text-sm text-dorado-dark underline-offset-4 hover:underline"
          >
            Volver al inicio
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-8 text-center lg:text-left">
            <p className="eyebrow text-dorado-dark">Crear cuenta</p>
            <h1 className="mt-3 font-display text-4xl text-verde">
              Únete a Reforme
            </h1>
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
              onChange={(e) => set("nombre", e.target.value)}
              error={errors.nombre}
            />

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
              autoComplete="tel"
              placeholder="+57 320 000 0000"
              value={values.telefono}
              onChange={(e) => set("telefono", e.target.value)}
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
                  <Link
                    href="#"
                    className="text-dorado-dark underline-offset-4 hover:underline"
                  >
                    términos
                  </Link>{" "}
                  y la{" "}
                  <Link
                    href="#"
                    className="text-dorado-dark underline-offset-4 hover:underline"
                  >
                    política de privacidad
                  </Link>
                  .
                </span>
              </label>
              {errors.terms && (
                <p className="mt-1.5 text-xs text-red-600">{errors.terms}</p>
              )}
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full">
              Crear mi cuenta
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
