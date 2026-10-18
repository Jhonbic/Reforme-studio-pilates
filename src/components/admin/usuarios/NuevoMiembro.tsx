"use client";

import { useState, useTransition } from "react";
import Modal from "@/components/admin/Modal";
import CampoSelect from "@/components/admin/campos/CampoSelect";
import CampoTexto from "@/components/admin/campos/CampoTexto";
import { useToast } from "@/context/ToastContext";
import { crearMiembro } from "@/lib/admin/acciones";
import type { RolEquipo } from "@/lib/admin/types";
import ContrasenaTemporal from "./ContrasenaTemporal";
import {
  esCorreo,
  esMovilCO,
  normalizarTelefonoPegado,
  sinDigitos,
} from "@/lib/validacion";

const ROLES: RolEquipo[] = ["Instructora", "Recepción", "Administración"];

const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center justify-center gap-2 overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde";
const BOTON_PRIMARIO =
  "inline-flex min-h-[44px] items-center justify-center rounded-full bg-dorado px-5 text-sm font-medium text-verde-900 transition-colors duration-300 hover:bg-dorado-dark disabled:opacity-60";

const VACIO = { nombre: "", correo: "", telefono: "", rol: "Instructora" };

/**
 * Alta de una persona en el equipo **con su cuenta** (decisión del usuario,
 * oct 2026): al guardar, el diálogo enseña su contraseña temporal para
 * entregársela, y la primera vez que entre tendrá que elegir la suya.
 *
 * El correo es obligatorio: es su usuario para entrar al panel.
 */
export default function NuevoMiembro({ className }: { className: string }) {
  const { mostrarAviso } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [v, setV] = useState(VACIO);
  const [errores, setErrores] = useState<Partial<Record<keyof typeof VACIO, string>>>({});
  const [errorEnvio, setErrorEnvio] = useState("");
  /** Tras guardar: a quién y qué contraseña temporal enseñar. */
  const [creada, setCreada] = useState<{ nombre: string; correo: string; contrasena: string } | null>(null);
  const [guardando, iniciar] = useTransition();

  function cerrar() {
    setAbierto(false);
    setV(VACIO);
    setErrores({});
    setErrorEnvio("");
    setCreada(null);
  }

  function set(campo: keyof typeof VACIO, valor: string) {
    setV((p) => ({ ...p, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const nuevos: typeof errores = {};
    if (v.nombre.trim().length < 3) nuevos.nombre = "Escribe su nombre completo.";
    if (!esCorreo(v.correo)) nuevos.correo = "Escribe un correo válido.";
    if (v.telefono && !esMovilCO(v.telefono)) nuevos.telefono = "Un móvil colombiano: 10 dígitos que empiezan por 3.";
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;

    setErrorEnvio("");
    iniciar(async () => {
      const r = await crearMiembro(v);
      if (!r.ok) {
        if (r.campo === "correo") return setErrores((e) => ({ ...e, correo: r.error }));
        return setErrorEnvio(r.error);
      }
      const nombre = v.nombre.trim();
      if (r.contrasena) {
        setCreada({ nombre, correo: v.correo.trim().toLowerCase(), contrasena: r.contrasena });
        return;
      }
      cerrar();
      mostrarAviso(r.aviso ?? `${nombre} ya está en el equipo.`, "success");
    });
  }

  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className={className}>
        <span className="control-sheen control-sheen--lento" aria-hidden="true" />
        <span aria-hidden="true">+</span>
        Nuevo miembro
      </button>

      <Modal
        abierto={abierto}
        onCerrar={cerrar}
        cerrable={!guardando}
        titulo={creada ? `${creada.nombre} ya está en el equipo` : "Nuevo miembro del equipo"}
        tamano="md"
      >
        {creada ? (
          <ContrasenaTemporal
            nombre={creada.nombre}
            correo={creada.correo}
            contrasena={creada.contrasena}
            onHecho={cerrar}
          />
        ) : (
        <form onSubmit={enviar} noValidate className="space-y-4">
          <CampoTexto
            nombre="miembro-nombre"
            etiqueta="Nombre completo"
            value={v.nombre}
            onChange={(e) => set("nombre", sinDigitos(e.target.value))}
            error={errores.nombre}
            autoComplete="off"
            ancho
          />
          <CampoTexto
            nombre="miembro-correo"
            etiqueta="Correo"
            type="email"
            value={v.correo}
            onChange={(e) => set("correo", e.target.value)}
            error={errores.correo}
            ayuda="Será su usuario para entrar al panel."
            autoComplete="off"
            ancho
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto
              nombre="miembro-telefono"
              etiqueta="Teléfono (opcional)"
              inputMode="numeric"
              value={v.telefono}
              onChange={(e) => set("telefono", normalizarTelefonoPegado(e.target.value))}
              error={errores.telefono}
              autoComplete="off"
            />
            <CampoSelect
              nombre="miembro-rol"
              etiqueta="Rol"
              value={v.rol}
              onChange={(e) => set("rol", e.target.value)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </CampoSelect>
          </div>

          {errorEnvio && (
            <p
              role="alert"
              className="rounded-xl border border-[color-mix(in_srgb,var(--color-estado-grave)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-estado-grave)_8%,transparent)] px-4 py-3 text-sm text-[var(--color-estado-grave)]"
            >
              {errorEnvio}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <button type="button" onClick={cerrar} className={BOTON}>
              <span className="control-sheen" aria-hidden="true" />
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className={BOTON_PRIMARIO}>
              {guardando ? "Creando su cuenta…" : "Añadir al equipo"}
            </button>
          </div>
        </form>
        )}
      </Modal>
    </>
  );
}
