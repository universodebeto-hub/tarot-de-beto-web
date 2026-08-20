"use client";

import { useActionState } from "react";
import type { AdminFormState } from "@/server/admin/services";
import { GlassCard } from "@/components/ui/GlassCard";
import type { Service } from "@/types/content";

const MODALITY_TO_ENUM: Record<Service["modality"], string> = {
  Videollamada: "VIDEOLLAMADA",
  Llamada: "LLAMADA",
  Presencial: "PRESENCIAL",
};

const inputClass =
  "w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-bone outline-none focus:border-gold/50";
const labelClass = "mb-1.5 block font-mono text-[11px] uppercase tracking-wide text-ash";

interface ServiceFormProps {
  action: (prev: AdminFormState, formData: FormData) => Promise<AdminFormState>;
  service?: Service;
  submitLabel: string;
}

export function ServiceForm({ action, service, submitLabel }: ServiceFormProps) {
  const [state, formAction, pending] = useActionState(action, {} as AdminFormState);

  return (
    <GlassCard>
      <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Nombre</label>
          <input name="name" required defaultValue={service?.name} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Slug (para URLs)</label>
          <input name="slug" required defaultValue={service?.slug} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Descripción</label>
          <textarea
            name="description"
            required
            rows={3}
            defaultValue={service?.description}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Duración (minutos)</label>
          <input
            type="number"
            name="durationMinutes"
            required
            min={5}
            defaultValue={service?.durationMinutes}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Precio</label>
          <input
            type="number"
            name="price"
            required
            min={0}
            step="0.01"
            defaultValue={service?.price}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Moneda</label>
          <input name="currency" required defaultValue={service?.currency ?? "USD"} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Modalidad</label>
          <select
            name="modality"
            defaultValue={service ? MODALITY_TO_ENUM[service.modality] : "VIDEOLLAMADA"}
            className={inputClass}
          >
            <option value="VIDEOLLAMADA">Videollamada</option>
            <option value="LLAMADA">Llamada</option>
            <option value="PRESENCIAL">Presencial</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Categoría</label>
          <input name="category" required defaultValue={service?.category} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Orden</label>
          <input type="number" name="sortOrder" defaultValue={0} className={inputClass} />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            id="available"
            name="available"
            defaultChecked={service?.available ?? true}
            className="h-4 w-4 accent-gold"
          />
          <label htmlFor="available" className="mb-0 font-mono text-[11px] uppercase tracking-wide text-ash">
            Disponible para reservar
          </label>
        </div>

        {state.error ? <p className="mb-0 text-sm text-ember sm:col-span-2">{state.error}</p> : null}
        {state.success ? <p className="mb-0 text-sm text-gold-soft sm:col-span-2">Guardado correctamente.</p> : null}

        <button type="submit" disabled={pending} className="btn btn-gold self-start sm:col-span-2">
          {pending ? "Guardando…" : submitLabel}
        </button>
      </form>
    </GlassCard>
  );
}
