"use client";

import { useActionState, useState } from "react";
import { createTarotistaAction } from "@/app/admin/tarotistas/actions";
import type { CreateTarotistaResult } from "@/server/admin/tarotistas";

const initialState: CreateTarotistaResult = {};

const inputClass =
  "rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-bone outline-none focus:border-gold/50";

/** Crea un perfil de tarotista desde cero (nombre, bio, experiencia, especialidades) -- antes esto solo se podía hacer editando el código. La cuenta de acceso y la foto se agregan después (ver LinkTarotistaForm). */
export function CreateTarotistaForm() {
  const [state, formAction, pending] = useActionState(createTarotistaAction, initialState);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-gold self-start">
        + Crear tarotista nuevo
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Nombre
        <input name="name" required placeholder="Ej. María Fernanda" className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Experiencia
        <input name="experience" placeholder="Ej. 8 años de experiencia" className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Biografía
        <textarea name="bio" rows={3} placeholder="Presentación breve para su ficha pública" className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Especialidades (separadas por coma)
        <input name="specialties" placeholder="Ej. Tarot, Numerología" className={inputClass} />
      </label>
      {state.error ? <p className="mb-0 text-sm text-ember">{state.error}</p> : null}
      {state.tarotista ? (
        <p className="mb-0 text-sm text-gold-soft">
          Perfil creado — ahora pedile a la persona que se registre y vinculá su cuenta acá abajo.
        </p>
      ) : null}
      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="btn btn-gold self-start disabled:opacity-60">
          {pending ? "Creando…" : "Crear"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost self-start">
          Cancelar
        </button>
      </div>
    </form>
  );
}
