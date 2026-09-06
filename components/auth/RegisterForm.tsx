"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerUser } from "@/server/auth";
import type { AuthFormState } from "@/server/auth";
import { GlassCard } from "@/components/ui/GlassCard";
import { COUNTRIES } from "@/lib/countries";

const initialState: AuthFormState = {};

const inputClass =
  "w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-bone outline-none focus:border-gold/50";
const selectClass =
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
          <label htmlFor="username" className={labelClass}>
            Usuario
          </label>
          <input
            id="username"
            name="username"
            required
            minLength={3}
            maxLength={24}
            pattern="[a-zA-Z0-9_.]+"
            title="Solo letras, números, punto y guion bajo"
            placeholder="ej. juanperez"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="phone" className={labelClass}>
            Teléfono / WhatsApp (opcional)
          </label>
          <div className="flex gap-2">
            <select
              id="phoneDialCode"
              name="phoneDialCode"
              defaultValue="+57"
              className={`${selectClass} w-[5.5rem] shrink-0 !px-2`}
              aria-label="Código de país del teléfono"
            >
              {COUNTRIES.map((c) => (
                <option key={`${c.iso2}-${c.dialCode}`} value={c.dialCode} className="bg-obsidian">
                  {c.dialCode}
                </option>
              ))}
            </select>
            <input
              id="phone"
              name="phoneNumber"
              type="tel"
              placeholder="3001234567"
              className={`${inputClass} min-w-0 flex-1`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="country" className={labelClass}>
            País
          </label>
          <select id="country" name="country" required defaultValue="" className={selectClass}>
            <option value="" disabled className="bg-obsidian">
              Elige tu país
            </option>
            {COUNTRIES.filter((c) => c.iso2 !== "XX").map((c) => (
              <option key={c.iso2} value={c.name} className="bg-obsidian">
                {c.name}
              </option>
            ))}
          </select>
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

        <div>
          <label htmlFor="confirmPassword" className={labelClass}>
            Repetir contraseña
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
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
