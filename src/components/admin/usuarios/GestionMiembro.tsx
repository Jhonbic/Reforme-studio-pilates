"use client";

import { useState, useTransition } from "react";
import Modal from "@/components/admin/Modal";
import CampoSelect from "@/components/admin/campos/CampoSelect";
import { useToast } from "@/context/ToastContext";
import {
  cambiarRol,
  darAcceso,
  nuevaContrasenaTemporal,
  quitarAcceso,
  type ResultadoEquipo,
} from "@/lib/admin/acciones";
import type { MiembroEquipo, RolEquipo } from "@/lib/admin/types";

const ROLES: RolEquipo[] = ["Administración", "Recepción", "Instructora"];

const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center justify-center gap-2 overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde disabled:opacity-60";
const BOTON_PRIMARIO =
  "inline-flex min-h-[44px] items-center justify-center rounded-full bg-dorado px-5 text-sm font-medium text-verde-900 transition-colors duration-300 hover:bg-dorado-dark disabled:opacity-60";
const BOTON_PELIGRO =
  "inline-flex min-h-[44px] items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--color-estado-grave)_40%,transparent)] px-5 text-sm text-[var(--color-estado-grave)] transition-colors duration-300 hover:bg-[color-mix(in_srgb,var(--color-estado-grave)_8%,transparent)] disabled:opacity-60";

type Props = {
  miembro: MiembroEquipo | null;
  /** Correo de quien tiene la sesión: sobre sí misma no se ofrecen las
   *  acciones que podrían dejarla fuera (el servidor también lo impide). */
  correoActual: string;
  onCerrar: () => void;
};

/**
 * Gestión de una persona del equipo: su rol y su acceso al panel.
 *
 * ⚠️ **La contraseña temporal se enseña UNA vez.** No se guarda en ningún
 * sitio que se pueda volver a leer (Supabase solo guarda su hash), así que el
 * diálogo no se cierra solo tras crearla: se queda enseñándola hasta que
 * Administración la copie y pulse «Hecho». Si se pierde, se genera otra.
 *
 * Mientras una acción está en vuelo el diálogo no se puede cerrar
 * (`cerrable`): cerrarlo a medias dejaría sin saber si la cuenta se creó.
 */
export default function GestionMiembro({ miembro, correoActual, onCerrar }: Props) {
  const { mostrarAviso } = useToast();
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [copiada, setCopiada] = useState(false);
  const [confirmarQuitar, setConfirmarQuitar] = useState(false);
  const [enCurso, iniciar] = useTransition();

  const esYo = miembro?.correo.toLowerCase() === correoActual.toLowerCase();

  function cerrar() {
    setContrasena("");
    setError("");
    setCopiada(false);
    setConfirmarQuitar(false);
    onCerrar();
  }

  /** Ejecuta una acción y decide qué enseñar: la contraseña (si la hay), un
   *  aviso o el error dentro del diálogo. */
  function ejecutar(accion: () => Promise<ResultadoEquipo>, exito: string) {
    setError("");
    iniciar(async () => {
      const r = await accion();
      if (!r.ok) return setError(r.error);
      setConfirmarQuitar(false);
      if (r.contrasena) {
        setContrasena(r.contrasena);
        return;
      }
      mostrarAviso(r.aviso ?? exito, "success");
      cerrar();
    });
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(contrasena);
      setCopiada(true);
    } catch {
      // Sin permiso de portapapeles (http, navegador viejo): queda a la vista
      // y seleccionable, que es lo que importa.
      setCopiada(false);
    }
  }

  if (!miembro) return null;

  return (
    <Modal
      abierto={miembro !== null}
      onCerrar={cerrar}
      cerrable={!enCurso}
      titulo={miembro.nombre}
      tamano="md"
    >
      {contrasena ? (
        <div className="space-y-4">
          <p className="text-sm text-verde-700">
            Contraseña temporal de <strong>{miembro.nombre}</strong>. Entra con
            su correo <strong>{miembro.correo}</strong> y esta contraseña, y la
            cambia desde su menú de cuenta.
          </p>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dorado/50 bg-dorado/10 px-4 py-3">
            <code className="select-all font-cifra text-xl font-normal tracking-wider text-verde">
              {contrasena}
            </code>
            <button type="button" onClick={copiar} className={BOTON}>
              <span className="control-sheen" aria-hidden="true" />
              {copiada ? "Copiada ✓" : "Copiar"}
            </button>
          </div>
          <p className="text-xs text-verde-300">
            ⚠️ No se volverá a enseñar: guárdala o entrégala ahora. Si se
            pierde, genera otra.
          </p>
          <div className="flex justify-end">
            <button type="button" onClick={cerrar} className={BOTON_PRIMARIO}>
              Hecho
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-verde-300">Correo</dt>
              <dd className="break-all text-verde-700">{miembro.correo}</dd>
            </div>
            <div>
              <dt className="text-xs text-verde-300">Acceso al panel</dt>
              <dd className="text-verde-700">
                {miembro.acceso ? "Puede entrar" : "No puede entrar"}
              </dd>
            </div>
          </dl>

          {esYo ? (
            <p className="rounded-xl border border-beige bg-arena/50 px-4 py-3 text-sm text-verde-700">
              Eres tú. Tu rol y tu acceso los cambia otra persona de
              Administración, y tu contraseña, tu menú de cuenta: así nadie se
              queda fuera por un clic.
            </p>
          ) : (
            <>
              <CampoSelect
                nombre="rol"
                etiqueta="Rol"
                value={miembro.rol}
                disabled={enCurso}
                onChange={(e) =>
                  ejecutar(
                    () => cambiarRol(miembro.id, e.target.value),
                    `${miembro.nombre} ahora es ${e.target.value}.`,
                  )
                }
                ayuda="Cambia su puesto y lo que puede hacer en el panel a la vez."
                ancho
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </CampoSelect>

              <div className="flex flex-wrap gap-3">
                {miembro.acceso ? (
                  <>
                    <button
                      type="button"
                      disabled={enCurso}
                      onClick={() =>
                        ejecutar(
                          () => nuevaContrasenaTemporal(miembro.id),
                          "Contraseña cambiada.",
                        )
                      }
                      className={BOTON}
                    >
                      <span className="control-sheen" aria-hidden="true" />
                      Nueva contraseña temporal
                    </button>
                    {/* Quitar el acceso pide una segunda pulsación: es lo único
                        de este diálogo que deja a alguien fuera. */}
                    {confirmarQuitar ? (
                      <button
                        type="button"
                        disabled={enCurso}
                        onClick={() =>
                          ejecutar(
                            () => quitarAcceso(miembro.id),
                            `${miembro.nombre} ya no puede entrar al panel.`,
                          )
                        }
                        className={BOTON_PELIGRO}
                      >
                        Sí, quitar el acceso
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={enCurso}
                        onClick={() => setConfirmarQuitar(true)}
                        className={BOTON_PELIGRO}
                      >
                        Quitar acceso
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={enCurso}
                    onClick={() =>
                      ejecutar(
                        () => darAcceso(miembro.id),
                        `${miembro.nombre} ya puede entrar al panel.`,
                      )
                    }
                    className={BOTON_PRIMARIO}
                  >
                    {enCurso ? "Creando la cuenta…" : "Dar acceso al panel"}
                  </button>
                )}
              </div>
              {confirmarQuitar && (
                <p className="text-xs text-verde-300">
                  Su cuenta se conserva: si le devuelves el acceso, entra con la
                  misma contraseña.
                </p>
              )}
            </>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-[color-mix(in_srgb,var(--color-estado-grave)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-estado-grave)_8%,transparent)] px-4 py-3 text-sm text-[var(--color-estado-grave)]"
            >
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
