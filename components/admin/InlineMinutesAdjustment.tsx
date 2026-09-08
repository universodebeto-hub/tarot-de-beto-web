"use client";

import { useState, useTransition } from "react";
import { setManualMinutesAdjustmentAction } from "@/app/admin/reservas/[id]/actions";

/**
 * Igual que ManualMinutesAdjustmentForm pero compacto, para usar dentro de
 * una fila de tabla (panel de Consumo de minutos) -- sirve para cuando Beto
 * atendió la consulta por WhatsApp en vez de por la app: no hay ninguna
 * llamada registrada, así que el consumo automático da 0 y esto deja
 * cargar a mano cuántos minutos realmente se usaron.
 */
export function InlineMinutesAdjustment({ bookingId, initial }: { bookingId: string; initial: number }) {
  const [value, setValue] = useState(String(initial));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await setManualMinutesAdjustmentAction(bookingId, Number(value));
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        title="Minutos consumidos por WhatsApp u otra vía fuera de la app"
        className="w-16 rounded-md border border-white/15 bg-obsidian/60 px-2 py-1 text-xs text-bone"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={pending || Number(value) === initial}
        className="rounded-md border border-white/15 px-2 py-1 text-[11px] uppercase tracking-wide text-bone-dim hover:border-gold/30 hover:text-gold-soft disabled:opacity-40"
      >
        {pending ? "…" : "Guardar"}
      </button>
      {error ? <span className="text-[11px] text-ember">{error}</span> : null}
    </div>
  );
}
