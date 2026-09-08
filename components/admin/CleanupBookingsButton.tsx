"use client";

import { useState, useTransition } from "react";
import { cleanupIncompleteBookingsAction } from "@/app/admin/actions";

/** Borra de una vez las reservas expiradas/canceladas/vencidas sin pagar -- pide confirmación porque es irreversible. */
export function CleanupBookingsButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const confirmed = window.confirm(
      "¿Eliminar todas las reservas que no se concretaron (expiradas, canceladas sin pagar, o vencidas)? No se puede deshacer.",
    );
    if (!confirmed) return;
    startTransition(async () => {
      const result = await cleanupIncompleteBookingsAction();
      if (result?.error) setMessage(result.error);
      else setMessage(`Listo: se eliminaron ${result?.deleted ?? 0} reservas.`);
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button type="button" onClick={handleClick} disabled={pending} className="btn btn-ghost disabled:opacity-60">
        {pending ? "Eliminando…" : "Eliminar reservas no concretadas"}
      </button>
      {message ? <p className="mb-0 text-sm text-bone-dim">{message}</p> : null}
    </div>
  );
}
