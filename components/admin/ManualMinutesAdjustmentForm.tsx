"use client";

import { useState, useTransition } from "react";
import { setManualMinutesAdjustmentAction } from "@/app/admin/reservas/[id]/actions";

/** Corrección manual de minutos (puede ser negativa) -- para cuando hubo un problema real de conexión que el conteo automático no captó bien. */
export function ManualMinutesAdjustmentForm({ bookingId, initial }: { bookingId: string; initial: number }) {
  const [value, setValue] = useState(String(initial));
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await setManualMinutesAdjustmentAction(bookingId, Number(value));
      setMessage(result.error ?? "Guardado.");
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 border-t border-white/10 pt-3">
      <label className="flex flex-col gap-1 text-sm">
        Ajuste manual (minutos, puede ser negativo)
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-32 rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-bone"
        />
      </label>
      <button type="button" onClick={handleSave} disabled={pending} className="btn btn-ghost disabled:opacity-60">
        {pending ? "Guardando…" : "Guardar ajuste"}
      </button>
      {message ? <p className="mb-0 text-sm text-bone-dim">{message}</p> : null}
    </div>
  );
}
