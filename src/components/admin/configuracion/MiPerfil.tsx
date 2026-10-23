"use client";

import { useState } from "react";
import Card from "@/components/admin/Card";
import CardHeader from "@/components/admin/CardHeader";
import CambiarContrasena from "@/components/admin/CambiarContrasena";
import { iniciales } from "@/lib/admin/format";
import type { UsuarioActual } from "@/lib/admin/types";
import { cerrarSesion } from "@/lib/auth/acciones";

const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center justify-center gap-2 overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde";

/**
 * La cuenta de quien ha entrado: la tiene CADA rol, a diferencia del resto de
 * Configuración, que es de Administración (decisión del usuario, oct 2026).
 * Se llega también pulsando el nombre en la barra lateral.
 */
export default function MiPerfil({ usuario }: { usuario: UsuarioActual }) {
  const [cambiando, setCambiando] = useState(false);

  return (
    <Card>
      <CardHeader titulo="Mi perfil" />
      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span
            aria-hidden="true"
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-dorado/15 font-display text-xl text-dorado-tinta"
          >
            {iniciales(usuario.nombre)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-2xl leading-tight text-verde">{usuario.nombre}</p>
            <p className="mt-0.5 truncate text-sm text-verde-300">{usuario.correo}</p>
            <p className="eyebrow mt-1.5 text-dorado-tinta">{usuario.rol}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
          <button type="button" onClick={() => setCambiando(true)} className={BOTON}>
            <span className="control-sheen control-sheen--lento" aria-hidden="true" />
            Cambiar contraseña
          </button>
          {/* Un `<form>` y no un enlace: cerrar sesión cambia estado en el
              servidor, y un GET a `/logout` lo dispararía cualquier precarga
              de enlaces o una imagen incrustada en otra web. */}
          <form action={cerrarSesion}>
            <button type="submit" className={`${BOTON} w-full`}>
              <span className="control-sheen control-sheen--lento" aria-hidden="true" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
      <CambiarContrasena abierto={cambiando} onCerrar={() => setCambiando(false)} />
    </Card>
  );
}
