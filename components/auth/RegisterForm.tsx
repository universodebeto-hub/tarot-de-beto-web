"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerUser } from "@/server/auth";
import type { AuthFormState } from "@/server/auth";
import { GlassCard } from "@/components/ui/GlassCard";

const initialState: AuthFormState = {};

const inputClass =
  "w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-bone outline-none focus:border-gold/50";
const labelClass = "mb-1.5 block font-mono text-[11px] uppercase tracking-wide text-ash";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerUser, initialState);

  return (
    <GlassCard className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className={labelClass}>
              Nombre
            </label>
            <input id="firstName" name="firstName" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="lastName" className={labelClass}>
              Apellido (opcional)
            </label>
            <input id="lastName" name="lastName" className={inputClass} />
          </div>
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input id="email" name="email" type="email" required className={inputClass} />
        </div>

        <div>
          <label htmlFor="phone" className={labelClass}>
            Teléfono / WhatsApp (opcional)
          </label>
          <input id="phone" name="phone" type="tel" className={inputClass} />
        </div>

        <div>
          <label htmlFor="country" className={labelClass}>
            País (opcional)
          </label>
          <input id="country" name="country" className={inputClass} />
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>
            Contraseña
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
          {pending ? "Creando cuenta…" : "Crear cuenta"}
        </button>

        <p className="mb-0 font-mono text-[11.5px] uppercase tracking-wide text-ash">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-gold-soft hover:text-gold transition-colors">
            Iniciar sesión
          </Link>
        </p>
      </form>
    </GlassCard>
  );
}
