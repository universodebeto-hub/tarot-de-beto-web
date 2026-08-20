"use client";

import { useActionState } from "react";
import { upsertAvailabilityAction } from "@/app/admin/calendario/actions";
import type { AdminFormState } from "@/server/admin/services";

const initialState: AdminFormState = {};
const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function AvailabilityForm() {
  const [state, formAction, pending] = useActionState(upsertAvailabilityAction, initialState);

  return (
    <form action={formAction} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <select
        name="dayOfWeek"
        required
        className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-bone"
      >
        {DAYS.map((d, i) => (
          <option key={d} value={i}>
            {d}
          </option>
        ))}
      </select>
      <input
        type="time"
        name="startTime"
        required
        defaultValue="11:00"
        className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-bone"
      />
      <input
        type="time"
        name="endTime"
        required
        defaultValue="23:00"
        className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-bone"
      />
      <button type="submit" disabled={pending} className="btn btn-gold">
        {pending ? "Agregando…" : "Agregar franja"}
      </button>
      {state.error ? <p className="col-span-full mb-0 text-sm text-ember">{state.error}</p> : null}
    </form>
  );
}
