"use client";

import {
  ReactNode,
  useRef,
  useState,
  useEffect,
  useCallback,
  cloneElement,
  isValidElement,
} from "react";

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}

export default function Dropdown({
  trigger,
  children,
  align = "left",
  className = "",
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    buttonRef.current?.focus();
  }, []);

  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        close();
      }
    },
    [isOpen, close]
  );

  const handleClickOutside = useCallback(
    (event: PointerEvent) => {
      if (
        isOpen &&
        !buttonRef.current?.contains(event.target as Node) &&
        !contentRef.current?.contains(event.target as Node)
      ) {
        close();
      }
    },
    [isOpen, close]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.addEventListener("pointerdown", handleClickOutside);
      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.removeEventListener("pointerdown", handleClickOutside);
      };
    }
  }, [isOpen, handleEscape, handleClickOutside]);

  const triggerButton = isValidElement(trigger)
    ? cloneElement(trigger as React.ReactElement<any>, {
        ref: buttonRef,
        onClick: () => setIsOpen(!isOpen),
        "aria-expanded": isOpen,
        "aria-haspopup": "true",
      })
    : trigger;

  return (
    <div className="relative">
      {triggerButton}

      {isOpen && (
        <div
          ref={contentRef}
          className={`absolute top-full mt-2 rounded-lg border border-beige/50 bg-white shadow-lift ${
            align === "right" ? "right-0" : "left-0"
          } ${className} min-w-48 z-40`}
          role="menu"
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={() => {
        onClick?.();
      }}
      disabled={disabled}
      className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
        disabled
          ? "text-verde/40 cursor-not-allowed"
          : "text-verde hover:bg-arena/30 active:bg-arena/50"
      } ${className}`}
      role="menuitem"
    >
      {children}
    </button>
  );
}

export function DropdownDivider() {
  return <div className="border-t border-beige/50" />;
}
