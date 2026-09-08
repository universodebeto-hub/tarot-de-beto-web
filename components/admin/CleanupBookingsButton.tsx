"use client";

import { useState } from "react";
import { cleanupIncompleteBookingsAction } from "@/app/admin/actions";
import { ConfirmActionButton } from "@/components/admin/ConfirmActionButton";

/** Borra de una vez las reservas expiradas/canceladas/vencidas sin pagar -- pide confirmación porque es irreversible. */
export function CleanupBookingsButton() {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-2">
      <ConfirmActionButton
        label="Eliminar reservas no concretadas"
        pendingLabel="Eliminando…"
        tone="danger"
        confirmLabel="Sí, eliminar"
        confirmMessage="¿Eliminar todas las reservas que no se concretaron (expiradas, canceladas sin pagar, o vencidas)? No se puede deshacer."
        action={cleanupIncompleteBookingsAction}
        onSettled={(result) => setMessage(result?.error ?? `Listo: se eliminaron ${result?.deleted ?? 0} reservas.`)}
        className="btn btn-ghost disabled:opacity-60"
      />
      {message ? <p className="mb-0 text-sm text-bone-dim">{message}</p> : null}
    </div>
  );
}
