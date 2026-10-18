"use client";

import { useState, useTransition } from "react";
import Modal from "@/components/admin/Modal";
import CampoSelect from "@/components/admin/campos/CampoSelect";
import { useToast } from "@/context/ToastContext";
import {
  cambiarRol,
  desactivarMiembro,
  nuevaContrasenaTemporal,
  reactivarMiembro,
  type ResultadoEquipo,
} from "@/lib/admin/acciones";
import type { MiembroEquipo, RolEquipo } from "@/lib/admin/types";
import ContrasenaTemporal from "./ContrasenaTemporal";

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
 * Gestión de una persona del equipo: su rol, una contraseña temporal nueva y
 * desactivar (o reactivar) su perfil.
 *
 * ⚠️ **No hay «acceso al panel» aparte** (decisión del usuario, oct 2026):
 * todo miembro tiene cuenta desde el alta, y lo único que se apaga es el
 * perfil entero. Desactivado, no entra al panel ni sale entre las
 * instructoras; reactivado, entra con la contraseña que tenía.
 *
 * Mientras una acción está en vuelo el diálogo no se puede cerrar
 * (`cerrable`): cerrarlo a medias dejaría sin saber si se aplicó.
 */
export default function GestionMiembro({ miembro, correoActual, onCerrar }: Props) {
  const { mostrarAviso } = useToast();
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [confirmarDesactivar, setConfirmarDesactivar] = useState(false);
  const [enCurso, iniciar] = useTransition();

  const esYo = miembro?.correo.toLowerCase() === correoActual.toLowerCase();

  function cerrar() {
    setContrasena("");
    setError("");
    setConfirmarDesactivar(false);
    onCerrar();
  }

  /** Ejecuta una acción y decide qué enseñar: la contraseña (si la hay), un
   *  aviso o el error dentro del diálogo. */
  function ejecutar(accion: () => Promise<ResultadoEquipo>, exito: string) {
    setError("");
    iniciar(async () => {
      const r = await accion();
      if (!r.ok) return setError(r.error);
      setConfirmarDesactivar(false);
      if (r.contrasena) {
        setContrasena(r.contrasena);
        return;
      }
      mostrarAviso(r.aviso ?? exito, "success");
      cerrar();
    });
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
        <ContrasenaTemporal
          nombre={miembro.nombre}
          correo={miembro.correo}
          contrasena={contrasena}
          onHecho={cerrar}
        />
      ) : (
        <div className="space-y-5">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-verde-300">Correo</dt>
              <dd className="break-all text-verde-700">{miembro.correo}</dd>
            </div>
            <div>
              <dt className="text-xs text-verde-300">Perfil</dt>
              <dd className="text-verde-700">{miembro.activo ? "Activo" : "Desactivado"}</dd>
            </div>
          </dl>

          {esYo ? (
            <p className="rounded-xl border border-beige bg-arena/50 px-4 py-3 text-sm text-verde-700">
              Eres tú. Tu rol y tu perfil los cambia otra persona de
              Administración, y tu contraseña, Configuración → Mi perfil: así
              nadie se queda fuera por un clic.
            </p>
          ) : miembro.activo ? (
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
                <button
                  type="button"
                  disabled={enCurso}
                  onClick={() =>
                    ejecutar(() => nuevaContrasenaTemporal(miembro.id), "Contraseña cambiada.")
                  }
                  className={BOTON}
                >
                  <span className="control-sheen" aria-hidden="true" />
                  Nueva contraseña temporal
                </button>
                {/* Desactivar pide una segunda pulsación: es lo único de este
                    diálogo que deja a alguien fuera. */}
                {confirmarDesactivar ? (
                  <button
                    type="button"
                    disabled={enCurso}
                    onClick={() =>
                      ejecutar(
                        () => desactivarMiembro(miembro.id),
                        `Perfil de ${miembro.nombre} desactivado.`,
                      )
                    }
                    className={BOTON_PELIGRO}
                  >
                    Sí, desactivar
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={enCurso}
                    onClick={() => setConfirmarDesactivar(true)}
                    className={BOTON_PELIGRO}
                  >
                    Desactivar perfil
                  </button>
                )}
              </div>
              {confirmarDesactivar && (
                <p className="text-xs text-verde-300">
                  No podrá entrar al panel ni se le podrán asignar clases. Su
                  historial se conserva y puedes reactivarla cuando quieras.
                </p>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-verde-700">
                Su perfil está desactivado: no entra al panel ni se le asignan
                clases. Al reactivarlo entra con la contraseña que tenía.
              </p>
              <button
                type="button"
                disabled={enCurso}
                onClick={() =>
                  ejecutar(
                    () => reactivarMiembro(miembro.id),
                    `${miembro.nombre} vuelve a estar activa.`,
                  )
                }
                className={BOTON_PRIMARIO}
              >
                {enCurso ? "Reactivando…" : "Reactivar perfil"}
              </button>
            </div>
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
