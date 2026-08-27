"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { loginUser } from "@/server/auth";
import type { AuthFormState } from "@/server/auth";
import { GlassCard } from "@/components/ui/GlassCard";

const initialState: AuthFormState = {};

const inputClass =
  "w-full rounded-lg border border-white/15 bg-white/5 py-3 pl-11 pr-4 text-bone outline-none focus:border-gold/50";
const labelClass = "mb-1.5 block font-mono text-[11px] uppercase tracking-wide text-ash";

function FieldIcon({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-3.5 top-[42px] text-ash">{children}</span>
  );
}

const MailIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-[18px] w-[18px]">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m4 6.5 8 6 8-6" />
  </svg>
);

const LockIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-[18px] w-[18px]">
    <rect x="4.5" y="10.5" width="15" height="9.5" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </svg>
);

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction, pending] = useActionState(loginUser, initialState);

  return (
    <GlassCard className="flex flex-col gap-4">
      <p className="mb-0 text-center font-mono text-[11px] uppercase tracking-wide text-ash">
        Bienvenido a tu consulta
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        {callbackUrl ? <input type="hidden" name="callbackUrl" value={callbackUrl} /> : null}

        <div className="relative">
          <label htmlFor="email" className={labelClass}>
            Correo o usuario
          </label>
          <FieldIcon>{MailIcon}</FieldIcon>
          <input id="email" name="email" required className={inputClass} />
        </div>

        <div className="relative">
          <label htmlFor="password" className={labelClass}>
            Contraseña
          </label>
          <FieldIcon>{LockIcon}</FieldIcon>
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

        <div className="border-t border-white/10 pt-4 text-center">
          <Link
            href="/tarotistas"
            className="font-mono text-[11.5px] uppercase tracking-wide text-ash underline underline-offset-2 hover:text-gold-soft transition-colors"
          >
            Explorar como invitado
          </Link>
        </div>
      </form>
    </GlassCard>
  );
}
