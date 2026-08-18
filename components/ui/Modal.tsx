"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-obsidian/80 backdrop-blur-sm"
      />
      <div className="glass arcana relative w-full max-w-md" role="dialog" aria-modal="true">
        {title ? <h3 className="mb-4">{title}</h3> : null}
        {children}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 text-ash hover:text-gold-soft transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
