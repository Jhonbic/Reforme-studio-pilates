"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import Dropdown, {
  DropdownDivider,
  DropdownItem,
} from "@/components/admin/Dropdown";
import Modal from "@/components/admin/Modal";
import CampoTexto from "@/components/admin/campos/CampoTexto";
import { useToast } from "@/context/ToastContext";
import { darDeBaja, reactivarCliente } from "@/lib/admin/acciones";
import type { Cliente } from "@/lib/admin/types";
import { csvCliente, descargarCsv } from "./exportar";

const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center gap-2 overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde";
const VOLVER =
  "control-fx relative inline-flex min-h-[44px] items-center justify-center overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde disabled:opacity-50";
const PELIGRO =
  "inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--color-estado-grave)] px-5 text-sm font-medium text-white transition-colors duration-300 hover:bg-[color-mix(in_srgb,var(--color-estado-grave)_85%,black)] disabled:opacity-70";

/**
 * Acciones sobre un cliente: descargar su ficha, editar sus datos y darle de
 * baja (o reactivarlo).
 *
 * Editar y dar de baja son del mostrador (Administración y Recepción): a los
 * demás no se les enseñan. La base lo vuelve a impedir.
 *
 * Dar de baja NO borra: su historia (pagos, clases) se queda. Se le quitan las
 * reservas de clases que no han empezado y deja de poder reservar o comprar
 * plan hasta que se le reactive.
 */
export default function AccionesCliente({
  cliente,
  puedeEditar,
}: {
  cliente: Cliente;
  puedeEditar: boolean;
}) {
  const { mostrarAviso } = useToast();
  const router = useRouter();
  const [baja, setBaja] = useState(false);
  const [reactivar, setReactivar] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enCurso, iniciar] = useTransition();
  const deBaja = cliente.estado === "De baja";
  const nombre = cliente.nombre.split(" ")[0];

  function descargar() {
    /* El nombre del archivo lleva la cédula y no el nombre: dos clientes se
       pueden llamar igual, y además el nombre trae tildes y espacios que
       algunos sistemas de archivos maltratan. */
    descargarCsv(`cliente-${cliente.identificacion}.csv`, csvCliente(cliente));
    mostrarAviso(`Ficha de ${cliente.nombre} descargada`, "success");
  }

  function confirmarBaja() {
    iniciar(async () => {
      const r = await darDeBaja(cliente.id, motivo);
      if (!r.ok) return mostrarAviso(r.error, "error");
      setBaja(false);
      setMotivo("");
      mostrarAviso(
        `${cliente.nombre} queda de baja` +
          (r.reservasQuitadas > 0
            ? `. Se le ${r.reservasQuitadas === 1 ? "quitó 1 reserva" : `quitaron ${r.reservasQuitadas} reservas`}.`
            : "."),
        "success",
      );
    });
  }

  return (
    <>
      {/* Hasta `xl` el botón va a la IZQUIERDA (los botones bajan a su propia
          fila en la ficha) y el menú se abre hacia la derecha; alineado a la
          derecha se salía de la pantalla por la izquierda en móvil. En `xl` el
          botón vuelve a la esquina derecha y el menú también. */}
      <Dropdown
        alineacion="izquierda"
        clasePanel="xl:left-auto xl:right-0"
        claseBoton={BOTON}
        etiqueta={
          <>
            <span className="control-sheen" aria-hidden="true" />
            Acciones
            <span aria-hidden="true">▾</span>
          </>
        }
      >
        <DropdownItem onClick={descargar}>Descargar ficha (CSV)</DropdownItem>
        {puedeEditar && (
          <>
            <DropdownDivider />
            <DropdownItem onClick={() => router.push(`/admin/usuarios/${cliente.id}/editar`)}>
              Editar datos
            </DropdownItem>
            {deBaja ? (
              <DropdownItem onClick={() => setReactivar(true)}>Reactivar</DropdownItem>
            ) : (
              <DropdownItem
                onClick={() => setBaja(true)}
                className="text-[var(--color-estado-grave)]"
              >
                Dar de baja
              </DropdownItem>
            )}
          </>
        )}
      </Dropdown>

      <Modal
        abierto={baja}
        onCerrar={() => setBaja(false)}
        cerrable={!enCurso}
        titulo={`¿Dar de baja a ${nombre}?`}
        tamano="md"
        pie={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setBaja(false)} disabled={enCurso} className={VOLVER}>
              <span className="control-sheen" aria-hidden="true" />
              Volver
            </button>
            <button type="button" onClick={confirmarBaja} disabled={enCurso} className={PELIGRO}>
              {enCurso ? "Dando de baja…" : "Dar de baja"}
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-sm text-verde-700">
          <p>
            Se le quitan sus próximas reservas y no podrá reservar ni comprar un plan. Sus pagos y
            su historial se conservan, y se puede reactivar cuando vuelva.
          </p>
          <CampoTexto
            nombre="motivo-baja"
            etiqueta="Motivo (opcional)"
            value={motivo}
            maxLength={200}
            onChange={(e) => setMotivo(e.target.value)}
            autoComplete="off"
          />
        </div>
      </Modal>

      <ConfirmDialog
        abierto={reactivar}
        titulo={`¿Reactivar a ${nombre}?`}
        mensaje="Vuelve a ser cliente del estudio: puede reservar y se le puede asignar un plan."
        textoConfirmar="Reactivar"
        textoCancelar="Volver"
        variante="normal"
        cargando={enCurso}
        onConfirmar={() =>
          iniciar(async () => {
            const r = await reactivarCliente(cliente.id);
            setReactivar(false);
            mostrarAviso(r.ok ? `${cliente.nombre} vuelve a ser cliente.` : r.error, r.ok ? "success" : "error");
          })
        }
        onCancelar={() => setReactivar(false)}
      />
    </>
  );
}
