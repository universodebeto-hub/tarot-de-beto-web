"use client";

import {
  pauseUserCreditAction,
  resumeUserCreditAction,
  markUserCreditPaidAction,
} from "@/app/admin/clientes/[id]/actions";
import { ConfirmActionButton } from "@/components/admin/ConfirmActionButton";
import { StatusBadge } from "@/components/ui/StatusBadge";

export interface CreditStatus {
  minutesAccumulated: number;
  minutesCap: number;
  amountOwed: number;
  paused: boolean;
}

/** Cuenta corriente de "Créditos Beto" -- minutos acumulados contra el tope de 300, monto pendiente, y los controles para pausar/reactivar o saldar. */
export function CreditAccountPanel({ clientId, status }: { clientId: string; status: CreditStatus }) {
  const hasBalance = status.amountOwed > 0 || status.minutesAccumulated > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Cuenta de crédito</span>
        <StatusBadge label={status.paused ? "Pausado" : "Activo"} tone={status.paused ? "danger" : "success"} />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="mb-1 block font-mono text-[11px] uppercase tracking-wide text-ash">
            Minutos usados / {status.minutesCap}
          </span>
          <span className={status.minutesAccumulated >= status.minutesCap ? "text-ember" : "text-bone"}>
            {status.minutesAccumulated}
          </span>
        </div>
        <div>
          <span className="mb-1 block font-mono text-[11px] uppercase tracking-wide text-ash">Monto pendiente</span>
          <span className={status.amountOwed > 0 ? "text-gold-soft" : "text-bone"}>${status.amountOwed.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {status.paused ? (
          <ConfirmActionButton
            label="Reactivar crédito"
            confirmLabel="Sí, reactivar"
            confirmMessage="¿Reactivar el crédito de este cliente? Va a poder pedir consultas a crédito de nuevo, sin que el saldo pendiente cambie."
            action={() => resumeUserCreditAction(clientId)}
            className="btn btn-gold"
          />
        ) : (
          <ConfirmActionButton
            label="Pausar crédito"
            confirmLabel="Sí, pausar"
            confirmMessage="¿Pausar el crédito de este cliente? No va a poder pedir más consultas a crédito hasta que lo reactives o se salde la deuda."
            action={() => pauseUserCreditAction(clientId)}
            className="btn btn-ghost"
          />
        )}
        {hasBalance ? (
          <ConfirmActionButton
            label="Marcar como pagado"
            confirmLabel="Sí, ya me pagó"
            confirmMessage={`¿Confirmar que ${clientId ? "este cliente" : "el cliente"} ya pagó los $${status.amountOwed.toFixed(2)} pendientes? El contador de minutos y el monto vuelven a cero.`}
            action={() => markUserCreditPaidAction(clientId)}
            className="btn btn-ghost"
          />
        ) : null}
      </div>
    </div>
  );
}
