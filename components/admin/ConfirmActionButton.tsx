"use client";

import { useState, useTransition, type ReactNode } from "react";

interface ConfirmActionButtonProps<TResult extends { error?: string } | void> {
  label: string;
  icon?: ReactNode;
  /** Tooltip/aria-label -- necesario cuando `label` va vacío (botón solo-ícono). */
  title?: string;
  pendingLabel?: string;
  /** Texto de la ventana de confirmación -- puede incluir <em>/<strong>, no solo texto plano. */
  confirmMessage: ReactNode;
  confirmLabel?: string;
  /** "danger" tiñe el botón de confirmar en la ventana de ember (para eliminar/cancelar). */
  tone?: "danger" | "default";
  action: () => Promise<TResult>;
  /** Para leer campos propios del resultado además de `error` (ej. cuántos registros se borraron). */
  onSettled?: (result: TResult) => void;
  className?: string;
}

/**
 * Botón que pide confirmación antes de disparar una Server Action --
 * ventana propia con la identidad del sitio (glass + dorado) en vez del
 * cuadro genérico de `window.confirm()` del navegador. Usado para
 * cualquier acción irreversible o que conviene no ejecutar por accidente
 * (cancelar, eliminar, promover a administrador).
 */
export function ConfirmActionButton<TResult extends { error?: string } | void = void>({
  label,
  icon,
  title,
  pendingLabel,
  confirmMessage,
  confirmLabel = "Confirmar",
  tone = "default",
  action,
  onSettled,
  className,
}: ConfirmActionButtonProps<TResult>) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await action();
      setError(result && "error" in result && result.error ? result.error : null);
      setOpen(false);
      onSettled?.(result);
    });
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <button type="button" onClick={() => setOpen(true)} disabled={pending} title={title} aria-label={title ?? label} className={className}>
          {icon}
          {pending ? (pendingLabel ?? "Procesando…") : label}
        </button>
        {error && !onSettled ? <p className="mb-0 text-xs text-ember">{error}</p> : null}
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-obsidian/70 px-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="glass arcana w-full max-w-sm !bg-carbon-2/95 flex flex-col gap-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm text-bone-dim">{confirmMessage}</div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost" disabled={pending}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={pending}
                className={
                  tone === "danger"
                    ? "btn rounded-full border border-ember/50 bg-ember/15 px-6 py-2.5 font-mono text-[12.5px] uppercase tracking-[0.14em] text-ember transition-colors hover:bg-ember/25 disabled:opacity-60"
                    : "btn btn-gold disabled:opacity-60"
                }
              >
                {pending ? "Procesando…" : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
