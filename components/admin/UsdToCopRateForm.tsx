"use client";

import { useState, useTransition } from "react";
import { setUsdToCopRateAction } from "@/app/admin/contabilidad/actions";

/** Tasa USD -> COP usada para comparar ingresos contra el tope de UVT en pesos -- editable porque cambia todo el tiempo. */
export function UsdToCopRateForm({ initial }: { initial: number }) {
  const [rate, setRate] = useState(String(initial));
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await setUsdToCopRateAction(Number(rate));
      setMessage(result.error ?? "Guardada.");
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Tasa USD → COP
        <input
          type="number"
          min={0}
          step="0.01"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="w-32 rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-bone"
        />
      </label>
      <button type="button" onClick={handleSave} disabled={pending} className="btn btn-ghost disabled:opacity-60">
        {pending ? "Guardando…" : "Actualizar tasa"}
      </button>
      {message ? <p className="mb-0 text-sm text-bone-dim">{message}</p> : null}
    </div>
  );
}
