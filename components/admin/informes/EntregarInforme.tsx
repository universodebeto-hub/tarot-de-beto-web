"use client";

import { useState } from "react";
import { marcarEntregadoAction } from "@/app/admin/informes/actions";
import { ConfirmActionButton } from "@/components/admin/ConfirmActionButton";

/** "Marcar como entregado": la entrega la haces tú a mano (correo o WhatsApp); esto solo deja constancia. */
export function EntregarInforme({ informeId }: { informeId: string }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <ConfirmActionButton
        label="Marcar como entregado"
        pendingLabel="Guardando…"
        confirmMessage={
          <>
            Confirma que <strong>ya enviaste el PDF</strong> al cliente. El informe quedará cerrado (no se podrá editar) y la reserva pasará a completada.
          </>
        }
        confirmLabel="Sí, ya lo entregué"
        className="btn btn-gold"
        action={() => marcarEntregadoAction(informeId)}
        onSettled={(r) => setError(r.error ?? null)}
      />
      {error ? <p className="mb-0 text-sm text-ember" role="alert">{error}</p> : null}
    </div>
  );
}
