"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  push: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const kindStyles: Record<ToastKind, string> = {
  success: "border-gold/40 text-gold-soft",
  error: "border-ember/50 text-bone",
  info: "border-white/10 text-bone-dim",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, kind: ToastKind = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 flex-col gap-2 px-4 sm:left-auto sm:right-6 sm:translate-x-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`glass rounded-xl border px-5 py-3 font-body text-sm shadow-lg ${kindStyles[t.kind]}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}
