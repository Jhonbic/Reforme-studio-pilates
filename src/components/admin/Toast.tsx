"use client";

import { useEffect } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onDismiss: (id: string) => void;
  duration?: number;
}

export default function Toast({
  id,
  message,
  type,
  onDismiss,
  duration = 4000,
}: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onDismiss(id), duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onDismiss]);

  const colors = {
    success: {
      bg: "bg-green-50",
      border: "border-green-200",
      icon: "text-green-600",
      text: "text-green-800",
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      icon: "text-red-600",
      text: "text-red-800",
    },
    warning: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: "text-amber-600",
      text: "text-amber-800",
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: "text-blue-600",
      text: "text-blue-800",
    },
  };

  const icons = {
    success: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l-2-2m0 0l-2-2m2 2l2-2m-2 2l-2 2m2-2l2 2m11-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0-12a9 9 0 110 18 9 9 0 010-18z" />
      </svg>
    ),
    info: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const color = colors[type];

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lift transition-all animate-in slide-in-from-top-2 ${color.bg} ${color.border}`}
      role="alert"
    >
      <div className={color.icon}>{icons[type]}</div>
      <p className={`flex-1 text-sm ${color.text}`}>{message}</p>
      <button
        onClick={() => onDismiss(id)}
        className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded text-sm transition-opacity hover:opacity-70"
        aria-label="Descartar"
      >
        ✕
      </button>
    </div>
  );
}
