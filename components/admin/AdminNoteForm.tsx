"use client";

import { useActionState } from "react";
import { addBookingNoteAction } from "@/app/admin/reservas/[id]/actions";
import type { AdminFormState } from "@/server/admin/services";

const initialState: AdminFormState = {};

export function AdminNoteForm({ bookingId }: { bookingId: string }) {
  const action = addBookingNoteAction.bind(null, bookingId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <textarea
        name="note"
        rows={3}
        placeholder="Nota interna (solo visible para el equipo)…"
        className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-sm text-bone outline-none focus:border-gold/50"
      />
      {state.error ? <p className="mb-0 text-sm text-ember">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="btn btn-ghost self-start">
        {pending ? "Guardando…" : "Agregar nota"}
      </button>
    </form>
  );
}
