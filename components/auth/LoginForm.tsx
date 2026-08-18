"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginUser } from "@/server/auth";
import type { AuthFormState } from "@/server/auth";
import { GlassCard } from "@/components/ui/GlassCard";

const initialState: AuthFormState = {};

const inputClass =
  "w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-bone outline-none focus:border-gold/50";
const labelClass = "mb-1.5 block font-mono text-[11px] uppercase tracking-wide text-ash";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction, pending] = useActionState(loginUser, initialState);

  return (
    <GlassCard className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        {callbackUrl ? <input type="hidden" name="callbackUrl" value={callbackUrl} /> : null}

        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input id="email" name="email" type="email" required className={inputClass} />
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>
            Contraseña
          </label>
          <input id="password" name="password" type="password" required className={inputClass} />
        </div>

        {state.error ? <p className="mb-0 text-sm text-ember">{state.error}</p> : null}

        <button type="submit" disabled={pending} className="btn btn-gold self-start">
          {pending ? "Ingresando…" : "Iniciar sesión"}
        </button>

        <div className="flex flex-wrap justify-between gap-2 font-mono text-[11.5px] uppercase tracking-wide">
          <Link href="/recuperar-password" className="text-ash hover:text-gold-soft transition-colors">
            ¿Olvidaste tu contraseña?
          </Link>
          <Link href="/registro" className="text-gold-soft hover:text-gold transition-colors">
            Crear cuenta
          </Link>
        </div>
      </form>
    </GlassCard>
  );
}
