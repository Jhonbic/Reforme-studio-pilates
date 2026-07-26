"use client";

import { useState } from "react";
import Card from "@/components/admin/Card";
import CardHeader from "@/components/admin/CardHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import Dropdown, {
  DropdownDivider,
  DropdownItem,
} from "@/components/admin/Dropdown";
import Modal from "@/components/admin/Modal";
import { useToast } from "@/context/ToastContext";

const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center gap-2 overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde";

function Boton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={BOTON}>
      <span className="control-sheen" aria-hidden="true" />
      {children}
    </button>
  );
}

/**
 * Banco de pruebas de los componentes transversales del panel.
 *
 * No es una sección del producto: no está en `SECCIONES`, así que no aparece en
 * la navegación. Sirve para ver los cuatro componentes juntos y comprobar a
 * mano el teclado (`Tab`, `Escape`) sin depender de una pantalla real que
 * todavía no los usa.
 */
export default function DemoPage() {
  const { mostrarAviso } = useToast();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [confirmAbierto, setConfirmAbierto] = useState(false);
  const [borrando, setBorrando] = useState(false);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <h1 className="sr-only">Componentes del panel</h1>

      <Card>
        <CardHeader titulo="Avisos flotantes" />
        <div className="mt-4 flex flex-wrap gap-3">
          <Boton onClick={() => mostrarAviso("Cliente guardado", "success")}>
            Éxito
          </Boton>
          <Boton
            onClick={() => mostrarAviso("La membresía vence en 3 días", "warning")}
          >
            Aviso
          </Boton>
          <Boton
            onClick={() => mostrarAviso("No se pudo guardar el cliente", "error")}
          >
            Error
          </Boton>
          <Boton onClick={() => mostrarAviso("Exportando 118 clientes", "info")}>
            Información
          </Boton>
        </div>
        <p className="mt-4 text-sm text-verde-300">
          El error no se cierra solo: uno que desaparece a los 4 s es uno que
          nadie llega a leer. El resto sí.
        </p>
      </Card>

      <Card>
        <CardHeader titulo="Diálogo" />
        <div className="mt-4">
          <Boton onClick={() => setModalAbierto(true)}>Abrir diálogo</Boton>
        </div>

        <Modal
          abierto={modalAbierto}
          onCerrar={() => setModalAbierto(false)}
          titulo="Diálogo de ejemplo"
          pie={
            <>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className={BOTON}
              >
                <span className="control-sheen" aria-hidden="true" />
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  mostrarAviso("Hecho", "success");
                  setModalAbierto(false);
                }}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-dorado px-5 text-sm font-medium text-verde-900 transition-colors duration-300 hover:bg-dorado-dark"
              >
                Guardar
              </button>
            </>
          }
        >
          <p className="text-verde-700">
            Con el diálogo abierto, el tabulador da vueltas dentro y no se
            escapa a la página de detrás. <kbd>Esc</kbd> cierra, y el foco vuelve
            al botón que lo abrió.
          </p>
        </Modal>
      </Card>

      <Card>
        <CardHeader titulo="Confirmación" />
        <div className="mt-4">
          <Boton onClick={() => setConfirmAbierto(true)}>
            Eliminar algo importante
          </Boton>
        </div>

        <ConfirmDialog
          abierto={confirmAbierto}
          titulo="¿Eliminar el cliente?"
          mensaje="Se borrarán también sus pagos y su historial de clases. Esta acción no se puede deshacer."
          textoConfirmar="Eliminar"
          variante="peligro"
          cargando={borrando}
          onConfirmar={async () => {
            setBorrando(true);
            await new Promise((r) => setTimeout(r, 1200));
            setBorrando(false);
            setConfirmAbierto(false);
            mostrarAviso("Cliente eliminado", "success");
          }}
          onCancelar={() => setConfirmAbierto(false)}
        />
      </Card>

      <Card>
        <CardHeader titulo="Desplegable" />
        <div className="mt-4">
          <Dropdown
            claseBoton={BOTON}
            etiqueta={
              <>
                <span className="control-sheen" aria-hidden="true" />
                Acciones
              </>
            }
          >
            <DropdownItem onClick={() => mostrarAviso("Editar", "info")}>
              Editar
            </DropdownItem>
            <DropdownItem onClick={() => mostrarAviso("Duplicar", "info")}>
              Duplicar
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem deshabilitado>Archivar</DropdownItem>
          </Dropdown>
        </div>
      </Card>
    </div>
  );
}
