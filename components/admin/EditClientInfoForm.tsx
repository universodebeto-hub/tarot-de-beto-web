"use client";

import { useActionState, useState } from "react";
import { updateClientInfoAction } from "@/app/admin/clientes/[id]/actions";
import type { AdminFormState } from "@/server/admin/services";

const initialState: AdminFormState = {};

interface EditClientInfoFormProps {
  userId: string;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  country: string | null;
}

const inputClass =
  "rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-bone outline-none focus:border-gold/50";

/** Corrige datos mal escritos al registrarse (ej. un typo en el correo) -- antes solo se podía arreglar tocando la base a mano. */
export function EditClientInfoForm({ userId, firstName, lastName, email, phone, country }: EditClientInfoFormProps) {
  const action = updateClientInfoAction.bind(null, userId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost self-start">
        Editar datos
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs text-ash">
          Nombre
          <input name="firstName" defaultValue={firstName} required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ash">
          Apellido
          <input name="lastName" defaultValue={lastName ?? ""} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ash">
          Correo
          <input type="email" name="email" defaultValue={email} required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ash">
          WhatsApp
          <input name="phone" defaultValue={phone ?? ""} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ash">
          País
          <input name="country" defaultValue={country ?? ""} className={inputClass} />
        </label>
      </div>
      {state.error ? <p className="mb-0 text-sm text-ember">{state.error}</p> : null}
      {state.success ? <p className="mb-0 text-sm text-gold-soft">Datos actualizados.</p> : null}
      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="btn btn-gold self-start disabled:opacity-60">
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost self-start">
          Cancelar
        </button>
      </div>
    </form>
  );
}
