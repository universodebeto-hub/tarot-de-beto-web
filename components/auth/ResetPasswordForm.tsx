"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPassword } from "@/server/auth";
import type { AuthFormState } from "@/server/auth";
import { GlassCard } from "@/components/ui/GlassCard";

const initialState: AuthFormState = {};

const inputClass =
  "w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-bone outline-none focus:border-gold/50";
const labelClass = "mb-1.5 block font-mono text-[11px] uppercase tracking-wide text-ash";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, initialState);

  if (state.success) {
    return (
      <GlassCard className="flex flex-col gap-4">
        <p className="mb-0 text-sm text-bone">Tu contraseña se actualizó correctamente.</p>
        <Link href="/login" className="btn btn-gold self-start">
          Iniciar sesión
        </Link>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="token" value={token} />

        <div>
          <label htmlFor="password" className={labelClass}>
            Nueva contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            className={inputClass}
          />
        </div>

        {state.error ? <p className="mb-0 text-sm text-ember">{state.error}</p> : null}

        <button type="submit" disabled={pending} className="btn btn-gold self-start">
          {pending ? "Guardando…" : "Restablecer contraseña"}
        </button>
      </form>
    </GlassCard>
  );
}
