"use client";

import { useActionState } from "react";
import { linkTarotistaAccountAction } from "@/app/admin/tarotistas/actions";
import type { LinkResult } from "@/server/admin/tarotistas";

const initialState: LinkResult = {};

export function LinkTarotistaForm({ tarotistaId }: { tarotistaId: string }) {
  const action = linkTarotistaAccountAction.bind(null, tarotistaId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-start gap-2">
      <input
        type="email"
        name="email"
        placeholder="correo@ejemplo.com"
        required
        className="min-w-[220px] flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-bone outline-none focus:border-gold/50"
      />
      <button type="submit" disabled={pending} className="btn btn-ghost">
        {pending ? "Vinculando…" : "Vincular"}
      </button>
      {state.error ? <p className="mb-0 w-full text-sm text-ember">{state.error}</p> : null}
    </form>
  );
}
