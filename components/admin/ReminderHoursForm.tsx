"use client";

import { useState, useTransition } from "react";
import { updateReminderHoursAction } from "@/app/admin/configuracion/actions";
import { TrashIcon } from "@/components/ui/icons";

/** Lista de avisos (a cuántas horas antes de la consulta se manda cada recordatorio) -- números simples, sin JSON. */
export function ReminderHoursForm({ initial }: { initial: number[] }) {
  const [hours, setHours] = useState<number[]>(initial.length > 0 ? initial : [24]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateHour(index: number, value: string) {
    const n = Number(value);
    setHours((prev) => prev.map((h, i) => (i === index ? n : h)));
  }

  function addHour() {
    setHours((prev) => [...prev, 1]);
  }

  function removeHour(index: number) {
    setHours((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateReminderHoursAction(hours);
      setMessage(result.error ?? "Guardado.");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="mb-0 text-sm text-bone-dim">
        Se manda un correo/aviso recordando la consulta a cada cantidad de horas antes que agregues acá.
      </p>
      {hours.map((h, index) => (
        <div key={index} className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            Avisar
            <input
              type="number"
              min={1}
              value={h}
              onChange={(e) => updateHour(index, e.target.value)}
              className="w-20 rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-bone"
            />
            horas antes
          </label>
          <button
            type="button"
            onClick={() => removeHour(index)}
            title="Quitar este aviso"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-ember/30 text-ember hover:border-ember hover:bg-ember/10"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ))}

      <button type="button" onClick={addHour} className="btn btn-ghost self-start">
        + Agregar aviso
      </button>

      <div className="flex items-center gap-3 border-t border-white/10 pt-4">
        <button type="button" onClick={handleSave} disabled={pending} className="btn btn-gold self-start disabled:opacity-60">
          {pending ? "Guardando…" : "Guardar recordatorios"}
        </button>
        {message ? <p className="mb-0 text-sm text-bone-dim">{message}</p> : null}
      </div>
    </div>
  );
}
