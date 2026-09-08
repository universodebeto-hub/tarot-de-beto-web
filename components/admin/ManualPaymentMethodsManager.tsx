"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  createManualPaymentMethodAction,
  updateManualPaymentMethodAction,
  toggleManualPaymentMethodActiveAction,
  deleteManualPaymentMethodAction,
} from "@/app/admin/configuracion/actions";
import { ConfirmActionButton } from "@/components/admin/ConfirmActionButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TrashIcon } from "@/components/ui/icons";

export interface ManualMethodItem {
  id: string;
  name: string;
  logoUrl: string;
  instructions: string;
  active: boolean;
}

async function uploadLogo(file: File): Promise<{ url?: string; error?: string }> {
  const form = new FormData();
  form.set("file", file);
  const res = await fetch("/api/uploads/payment-method-logo", { method: "POST", body: form });
  return res.json().catch(() => ({ error: "No se pudo subir la imagen." }));
}

function AddMethodForm() {
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    if (!name.trim() || !instructions.trim() || !file) {
      setMessage("Completá el nombre, las instrucciones, y elegí un logo.");
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const uploaded = await uploadLogo(file);
      if (!uploaded.url) {
        setMessage(uploaded.error ?? "No se pudo subir el logo.");
        return;
      }
      const result = await createManualPaymentMethodAction({ name, instructions, logoUrl: uploaded.url });
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setName("");
      setInstructions("");
      setFile(null);
      setMessage("Método agregado.");
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gold/20 bg-gold/[0.04] p-4">
      <span className="eyebrow">Agregar método de pago</span>
      <label className="flex flex-col gap-1 text-sm">
        Nombre
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Nequi, Daviplata, Efectivo en oficina..."
          className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-bone"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Instrucciones (lo que va a leer el cliente)
        <textarea
          rows={3}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Ej. Transferir a la cuenta 000-000000, titular Alberto Arango, cédula 0000000."
          className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-bone"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Logo
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-sm text-bone file:mr-3 file:rounded-md file:border-0 file:bg-gold file:px-3 file:py-1.5 file:font-mono file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-obsidian"
        />
      </label>
      <button type="button" onClick={handleSubmit} disabled={pending} className="btn btn-gold self-start disabled:opacity-60">
        {pending ? "Agregando…" : "Agregar método"}
      </button>
      {message ? <p className="mb-0 text-sm text-bone-dim">{message}</p> : null}
    </div>
  );
}

function MethodRow({ method }: { method: ManualMethodItem }) {
  const [name, setName] = useState(method.name);
  const [instructions, setInstructions] = useState(method.instructions);
  const [logoUrl, setLogoUrl] = useState(method.logoUrl);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    startTransition(async () => {
      const uploaded = await uploadLogo(file);
      if (uploaded.url) setLogoUrl(uploaded.url);
      else setMessage(uploaded.error ?? "No se pudo subir la imagen.");
    });
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateManualPaymentMethodAction(method.id, { name, instructions, logoUrl });
      setMessage(result.error ?? "Guardado.");
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-white">
            <Image src={logoUrl} alt={name} fill sizes="40px" className="object-contain p-1" />
          </div>
          <StatusBadge label={method.active ? "Activo" : "Inactivo"} tone={method.active ? "success" : "neutral"} />
        </div>
        <div className="flex items-center gap-2">
          <ConfirmActionButton
            label={method.active ? "Desactivar" : "Activar"}
            confirmLabel="Sí"
            confirmMessage={
              method.active
                ? `¿Desactivar "${method.name}"? Deja de aparecer como opción de pago.`
                : `¿Activar "${method.name}"?`
            }
            action={() => toggleManualPaymentMethodActiveAction(method.id)}
            className="btn btn-ghost"
          />
          <ConfirmActionButton
            label=""
            icon={<TrashIcon className="h-4 w-4" />}
            title="Eliminar"
            tone="danger"
            confirmLabel="Sí, eliminar"
            confirmMessage={`¿Eliminar "${method.name}"? Solo se puede si nunca se usó en ninguna reserva.`}
            action={() => deleteManualPaymentMethodAction(method.id)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-ember/30 text-ember hover:border-ember hover:bg-ember/10"
          />
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Nombre
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-bone"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Instrucciones
        <textarea
          rows={3}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-bone"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Cambiar logo
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleLogoChange}
          className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-sm text-bone file:mr-3 file:rounded-md file:border-0 file:bg-gold file:px-3 file:py-1.5 file:font-mono file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-obsidian"
        />
      </label>

      <div className="flex items-center gap-3">
        <button type="button" onClick={handleSave} disabled={pending} className="btn btn-ghost self-start disabled:opacity-60">
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
        {message ? <p className="mb-0 text-sm text-bone-dim">{message}</p> : null}
      </div>
    </div>
  );
}

/** Métodos de pago agregados por el admin (además de los 7 fijos) -- agregar/editar/activar-desactivar/eliminar, cada uno con su propio logo subido. */
export function ManualPaymentMethodsManager({ methods }: { methods: ManualMethodItem[] }) {
  return (
    <div className="flex flex-col gap-4">
      {methods.map((m) => (
        <MethodRow key={m.id} method={m} />
      ))}
      <AddMethodForm />
    </div>
  );
}
