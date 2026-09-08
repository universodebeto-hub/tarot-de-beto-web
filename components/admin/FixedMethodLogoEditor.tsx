"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { setPaymentMethodLogoAction } from "@/app/admin/configuracion/actions";
import type { PaymentMethod } from "@prisma/client";

interface FixedMethod {
  method: PaymentMethod;
  label: string;
  logoUrl: string;
}

/** Grilla de los 7 métodos de pago fijos (Pago Móvil, Zelle, ...) con un botón por cada uno para subir un logo propio -- sin esto, siempre se ve el archivo estático de siempre. */
export function FixedMethodLogoEditor({ methods }: { methods: FixedMethod[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {methods.map((m) => (
        <MethodLogoTile key={m.method} methodKey={m.method} label={m.label} logoUrl={m.logoUrl} />
      ))}
    </div>
  );
}

export function MethodLogoTile({
  methodKey,
  label,
  logoUrl,
}: {
  methodKey: string;
  label: string;
  logoUrl: string;
}) {
  const [currentLogo, setCurrentLogo] = useState(logoUrl);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(null);
    startTransition(async () => {
      const form = new FormData();
      form.set("file", file);
      try {
        const uploadRes = await fetch("/api/uploads/payment-method-logo", { method: "POST", body: form });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.url) {
          setMessage(uploadData.error ?? "No se pudo subir la imagen.");
          return;
        }
        const result = await setPaymentMethodLogoAction(methodKey, uploadData.url);
        if (result.error) {
          setMessage(result.error);
          return;
        }
        setCurrentLogo(uploadData.url);
        setMessage("Listo.");
      } catch {
        setMessage("No se pudo subir la imagen.");
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-white">
        <Image src={currentLogo} alt={label} fill sizes="64px" className="object-contain p-1" />
      </div>
      <span className="text-center font-mono text-[10px] uppercase tracking-wide text-ash">{label}</span>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" id={`logo-${methodKey}`} />
      <label
        htmlFor={`logo-${methodKey}`}
        className="cursor-pointer rounded-md border border-white/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-bone-dim hover:border-gold/30 hover:text-gold-soft"
      >
        {pending ? "Subiendo…" : "Cambiar imagen"}
      </label>
      {message ? <p className="mb-0 text-[10px] text-bone-dim">{message}</p> : null}
    </div>
  );
}
