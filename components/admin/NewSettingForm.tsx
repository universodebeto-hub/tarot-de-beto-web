"use client";

import { useActionState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

interface AdminFormState {
  error?: string;
  success?: boolean;
}

interface NewSettingFormProps {
  action: (prev: AdminFormState, formData: FormData) => Promise<AdminFormState>;
}

/** Crea una fila de configuración nueva (clave + valor JSON) -- las existentes se editan con SettingRow, esto es solo para claves que todavía no existen en la base de datos. */
export function NewSettingForm({ action }: NewSettingFormProps) {
  const [state, formAction, pending] = useActionState(action, {} as AdminFormState);

  return (
    <GlassCard className="flex flex-col gap-3 border-dashed">
      <span className="font-mono text-[11px] uppercase tracking-wide text-gold-soft">
        Agregar configuración nueva
      </span>
      <form action={formAction} className="flex flex-col gap-3">
        <input
          type="text"
          name="key"
          placeholder="ej. manual_payment_instructions"
          required
          className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 font-mono text-xs text-bone outline-none focus:border-gold/50"
        />
        <textarea
          name="value"
          rows={3}
          placeholder='{ "clave": "valor" }'
          required
          className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 font-mono text-xs text-bone outline-none focus:border-gold/50"
        />
        {state.error ? <p className="mb-0 text-sm text-ember">{state.error}</p> : null}
        {state.success ? <p className="mb-0 text-sm text-gold-soft">Creada -- ya aparece en la lista de abajo.</p> : null}
        <button type="submit" disabled={pending} className="btn btn-ghost self-start">
          {pending ? "Creando…" : "Crear"}
        </button>
      </form>
    </GlassCard>
  );
}
