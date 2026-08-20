"use client";

import { useActionState } from "react";
import { createBlockAction } from "@/app/admin/calendario/actions";
import type { AdminFormState } from "@/server/admin/services";

const initialState: AdminFormState = {};

export function BlockedTimeForm() {
  const [state, formAction, pending] = useActionState(createBlockAction, initialState);

  return (
    <form action={formAction} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <input
        type="date"
        name="date"
        required
        className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-bone"
      />
      <input
        type="time"
        name="startTime"
        placeholder="Inicio (opcional)"
        className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-bone"
      />
      <input
        type="time"
        name="endTime"
        placeholder="Fin (opcional)"
        className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-bone"
      />
      <input
        type="text"
        name="reason"
        placeholder="Motivo (opcional)"
        className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-bone"
      />
      <button type="submit" disabled={pending} className="btn btn-gold">
        {pending ? "Bloqueando…" : "Bloquear"}
      </button>
      <p className="col-span-full mb-0 text-xs text-ash">
        Deja hora de inicio/fin vacías para bloquear el día completo.
      </p>
      {state.error ? <p className="col-span-full mb-0 text-sm text-ember">{state.error}</p> : null}
    </form>
  );
}
