"use client";

import { useState } from "react";
import Modal from "@/components/admin/Modal";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import Dropdown, { DropdownItem, DropdownDivider } from "@/components/admin/Dropdown";
import { useToast } from "@/context/ToastContext";

export default function DemoPage() {
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="sr-only">Demo de componentes Fase 2</h1>
        <p className="eyebrow text-dorado-dark">Demo</p>
        <h2 className="mt-1.5 font-display text-3xl text-verde">
          Componentes Fase 2
        </h2>
      </div>

      {/* Toast Demo */}
      <section className="space-y-4">
        <h3 className="font-display text-xl text-verde">Toast Notifications</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => showToast("¡Operación exitosa!", "success")}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Toast Success
          </button>
          <button
            onClick={() =>
              showToast("Algo salió mal", "error")
            }
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Toast Error
          </button>
          <button
            onClick={() =>
              showToast("Ten cuidado con esto", "warning")
            }
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            Toast Warning
          </button>
          <button
            onClick={() =>
              showToast("Información importante", "info")
            }
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Toast Info
          </button>
        </div>
      </section>

      {/* Modal Demo */}
      <section className="space-y-4">
        <h3 className="font-display text-xl text-verde">Modal Dialog</h3>
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-dorado text-verde-900 rounded-lg hover:bg-dorado-dark transition-colors font-medium"
        >
          Abrir Modal
        </button>

        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Modal de ejemplo"
          footer={
            <>
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-beige/50 text-verde rounded-lg hover:bg-arena/50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  showToast("Modal cerrado con éxito", "success");
                  setModalOpen(false);
                }}
                className="px-4 py-2 bg-dorado text-verde-900 rounded-lg hover:bg-dorado-dark"
              >
                Confirmar
              </button>
            </>
          }
        >
          <p className="text-verde/70">
            Este es un modal reutilizable con gestión de foco, cierre por Escape, y backdrop clickeable.
          </p>
        </Modal>
      </section>

      {/* ConfirmDialog Demo */}
      <section className="space-y-4">
        <h3 className="font-display text-xl text-verde">Confirm Dialog</h3>
        <button
          onClick={() => setConfirmOpen(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          Confirmar acción destructiva
        </button>

        <ConfirmDialog
          isOpen={confirmOpen}
          title="¿Estás seguro?"
          message="Esta acción no se puede deshacer. ¿Quieres continuar?"
          confirmText="Eliminar"
          cancelText="Cancelar"
          variant="danger"
          onConfirm={async () => {
            showToast("Acción confirmada", "success");
            setConfirmOpen(false);
          }}
          onCancel={() => setConfirmOpen(false)}
        />
      </section>

      {/* Dropdown Demo */}
      <section className="space-y-4">
        <h3 className="font-display text-xl text-verde">Dropdown Menu</h3>
        <Dropdown
          trigger={
            <button className="px-4 py-2 bg-verde text-arena rounded-lg hover:bg-verde-700 transition-colors font-medium">
              Abrir menú
            </button>
          }
          align="left"
        >
          <DropdownItem
            onClick={() => showToast("Opción 1 seleccionada", "info")}
          >
            ✏️ Opción 1
          </DropdownItem>
          <DropdownItem
            onClick={() => showToast("Opción 2 seleccionada", "info")}
          >
            📋 Opción 2
          </DropdownItem>
          <DropdownDivider />
          <DropdownItem disabled>🔒 Opción 3 (deshabilitada)</DropdownItem>
          <DropdownItem
            onClick={() => showToast("Opción 4 seleccionada", "info")}
          >
            ⚙️ Opción 4
          </DropdownItem>
        </Dropdown>
      </section>

      {/* Feature Summary */}
      <section className="border-t border-beige/50 pt-8">
        <h3 className="font-display text-xl text-verde mb-4">
          Características implementadas
        </h3>
        <ul className="space-y-3 text-verde/70">
          <li className="flex gap-3">
            <span>✅</span>
            <span>
              <strong>Modal.tsx:</strong> Portal con backdrop, gestión de foco,
              cierre por Escape y click-fuera, accesibilidad `aria-modal`
            </span>
          </li>
          <li className="flex gap-3">
            <span>✅</span>
            <span>
              <strong>Toast + ToastContext:</strong> Sistema de notificaciones
              flotantes apilables con auto-dismiss
            </span>
          </li>
          <li className="flex gap-3">
            <span>✅</span>
            <span>
              <strong>Dropdown.tsx:</strong> Menú reutilizable con cierre por
              Escape y click-fuera, `aria-haspopup`, roles semánticos
            </span>
          </li>
          <li className="flex gap-3">
            <span>✅</span>
            <span>
              <strong>ConfirmDialog.tsx:</strong> Modal preconfigurado para
              confirmaciones destructivas con 3 variantes de estilo
            </span>
          </li>
          <li className="flex gap-3">
            <span>✅</span>
            <span>
              <strong>AppHeader mejorado:</strong> Ahora usa Dropdown component,
              mejor accesibilidad y consistencia visual
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
