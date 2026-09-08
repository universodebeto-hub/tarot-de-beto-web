"use client";

import { useActionState } from "react";
import { addClientNoteAction } from "@/app/client-notes-actions";
import type { AdminFormState } from "@/server/admin/services";

const initialState: AdminFormState = {};

/** Bitácora de seguimiento de un cliente -- visible/editable para el admin y para cualquier tarotista que ya lo haya atendido (ver server/client-notes.ts). */
export function ClientNotesPanel({
  clientId,
  notes,
  revalidatePaths,
}: {
  clientId: string;
  notes: string | null;
  revalidatePaths: string[];
}) {
  const action = addClientNoteAction.bind(null, clientId, revalidatePaths);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="flex flex-col gap-3">
      {notes ? (
        <pre className="mb-0 whitespace-pre-wrap font-body text-sm text-bone-dim">{notes}</pre>
      ) : (
        <p className="mb-0 text-sm text-ash">Sin notas todavía.</p>
      )}
      <form action={formAction} className="flex flex-col gap-3">
        <textarea
          name="note"
          rows={3}
          placeholder="Ej. Prefiere que le hablen de usted, está pasando por una separación..."
          className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-sm text-bone outline-none focus:border-gold/50"
        />
        {state.error ? <p className="mb-0 text-sm text-ember">{state.error}</p> : null}
        <button type="submit" disabled={pending} className="btn btn-ghost self-start">
          {pending ? "Guardando…" : "Agregar nota"}
        </button>
      </form>
    </div>
  );
}
