"use client";

import { ReactNode, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  closeButton?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  closeButton = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
  };

  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        onClose();
      }
    },
    [isOpen, onClose]
  );

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";

      setTimeout(() => {
        const firstFocusable = dialogRef.current?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as HTMLElement;
        firstFocusable?.focus();
      }, 0);

      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "";
        previousActiveElement.current?.focus();
      };
    }
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
      role="presentation"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

      {/* Modal */}
      <div
        ref={dialogRef}
        className={`relative z-10 w-full mx-4 rounded-lg bg-white shadow-lift ${sizeClasses[size]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-beige/50 px-6 py-4">
          <h2 id="modal-title" className="font-display text-lg text-verde">
            {title}
          </h2>
          {closeButton && (
            <button
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-verde/60 transition-colors hover:bg-arena/50 hover:text-verde focus-visible:outline-2 focus-visible:outline-dorado"
              aria-label="Cerrar"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-beige/50 bg-arena/20 px-6 py-4 flex gap-3 justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
