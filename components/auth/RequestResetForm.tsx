"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/server/auth";
import type { AuthFormState } from "@/server/auth";
import { GlassCard } from "@/components/ui/GlassCard";

const initialState: AuthFormState = {};

const inputClass =
  "w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-bone outline-none focus:border-gold/50";
const labelClass = "mb-1.5 block font-mono text-[11px] uppercase tracking-wide text-ash";

export function RequestResetForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  if (state.success) {
    return (
      <GlassCard>
        <p className="mb-0 text-sm text-bone">
          Si ese correo tiene una cuenta registrada, te enviamos un enlace para restablecer tu contraseña.
          Revisa tu bandeja de entrada.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input id="email" name="email" type="email" required className={inputClass} />
        </div>

        {state.error ? <p className="mb-0 text-sm text-ember">{state.error}</p> : null}

        <button type="submit" disabled={pending} className="btn btn-gold self-start">
          {pending ? "Enviando…" : "Enviar enlace de recuperación"}
        </button>
      </form>
    </GlassCard>
  );
}
