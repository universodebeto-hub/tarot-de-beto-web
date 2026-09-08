"use client";

import { useState, useTransition } from "react";

interface ConfirmActionButtonProps {
  label: string;
  pendingLabel?: string;
  confirmText: string;
  action: () => Promise<{ error?: string } | void>;
  className?: string;
}

/** Botón genérico que pide confirmación del navegador antes de disparar una Server Action -- usado para cualquier acción irreversible o que conviene no ejecutar por accidente (cancelar, eliminar). */
export function ConfirmActionButton({ label, pendingLabel, confirmText, action, className }: ConfirmActionButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(confirmText)) return;
    startTransition(async () => {
      const result = await action();
      if (result && "error" in result && result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={handleClick} disabled={pending} className={className}>
        {pending ? (pendingLabel ?? "Procesando…") : label}
      </button>
      {error ? <p className="mb-0 text-xs text-ember">{error}</p> : null}
    </div>
  );
}
