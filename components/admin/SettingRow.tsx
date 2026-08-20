"use client";

import { useActionState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

interface AdminFormState {
  error?: string;
  success?: boolean;
}

interface SettingRowProps {
  settingKey: string;
  value: string;
  action: (prev: AdminFormState, formData: FormData) => Promise<AdminFormState>;
}

export function SettingRow({ settingKey, value, action }: SettingRowProps) {
  const [state, formAction, pending] = useActionState(action, {} as AdminFormState);

  return (
    <GlassCard className="flex flex-col gap-3">
      <span className="font-mono text-[11px] uppercase tracking-wide text-gold">{settingKey}</span>
      <form action={formAction} className="flex flex-col gap-3">
        <textarea
          name="value"
          rows={3}
          defaultValue={value}
          className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 font-mono text-xs text-bone outline-none focus:border-gold/50"
        />
        {state.error ? <p className="mb-0 text-sm text-ember">{state.error}</p> : null}
        {state.success ? <p className="mb-0 text-sm text-gold-soft">Guardado.</p> : null}
        <button type="submit" disabled={pending} className="btn btn-ghost self-start">
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </form>
    </GlassCard>
  );
}
