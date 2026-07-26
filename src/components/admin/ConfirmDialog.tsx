"use client";

import Modal from "./Modal";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "default";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const variantClasses = {
    danger:
      "bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-600",
    warning:
      "bg-amber-600 hover:bg-amber-700 text-white focus-visible:ring-amber-600",
    default:
      "bg-dorado hover:bg-dorado-dark text-verde-900 focus-visible:ring-dorado",
  };

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} closeButton={true}>
      <p className="text-verde/70">{message}</p>

      <div className="mt-6 flex gap-3 justify-end">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 rounded-lg border border-beige/50 text-verde hover:bg-arena/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cancelText}
        </button>
        <button
          onClick={handleConfirm}
          disabled={isLoading}
          className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 ${variantClasses[variant]}`}
        >
          {isLoading ? (
            <>
              <svg
                className="inline-block h-4 w-4 mr-2 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Procesando...
            </>
          ) : (
            confirmText
          )}
        </button>
      </div>
    </Modal>
  );
}
