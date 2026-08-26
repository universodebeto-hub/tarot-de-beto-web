"use client";

import { useActionState } from "react";
import { createAttentionRequestAction } from "@/app/tarotistas/[slug]/actions";
import type { CreateAttentionRequestResult } from "@/server/attention-requests";

const initialState: CreateAttentionRequestResult = {};

export function AttentionRequestForm({ tarotistaId }: { tarotistaId: string }) {
  const action = createAttentionRequestAction.bind(null, tarotistaId);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (state.success) {
    return (
      <p className="mb-0 text-sm text-gold-soft">
        Recibimos tu solicitud — te contactaremos en cuanto sea posible.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input
        type="text"
        name="name"
        required
        placeholder="Tu nombre"
        className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-sm text-bone"
      />
      <input
        type="email"
        name="email"
        placeholder="Correo electrónico"
        className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-sm text-bone"
      />
      <input
        type="tel"
        name="phone"
        placeholder="WhatsApp"
        className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-sm text-bone"
      />
      <input
        type="text"
        name="preferredTime"
        placeholder="Preferencia de horario (opcional)"
        className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-sm text-bone"
      />
      <textarea
        name="message"
        rows={3}
        placeholder="Mensaje (opcional)"
        className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-sm text-bone"
      />
      <p className="mb-0 text-xs text-ash">Deja al menos un correo o un teléfono para poder contactarte.</p>
      {state.error ? <p className="mb-0 text-sm text-ember">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="btn btn-gold self-start disabled:opacity-60">
        {pending ? "Enviando..." : "Enviar solicitud"}
      </button>
    </form>
  );
}
