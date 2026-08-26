"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ManualPaymentInstructions } from "@/server/settings";

type ManualMethod = "PAGO_MOVIL" | "ZELLE" | "BINANCE";

const METHOD_LABEL: Record<ManualMethod, string> = {
  PAGO_MOVIL: "Pago Móvil",
  ZELLE: "Zelle",
  BINANCE: "Binance Pay",
};

interface ManualPaymentPanelProps {
  bookingId: string;
  instructions: ManualPaymentInstructions;
}

/**
 * Alternativa a PayPal para quienes pagan por Pago Móvil/Zelle/Binance: sin
 * pasarela, así que no hay confirmación automática — el cliente transfiere,
 * sube su comprobante, y Beto lo revisa y confirma manualmente desde el
 * panel (ver server/manual-payments.ts, app/admin/reservas/[id]/page.tsx).
 */
export function ManualPaymentPanel({ bookingId, instructions }: ManualPaymentPanelProps) {
  const router = useRouter();
  const [method, setMethod] = useState<ManualMethod | null>(null);
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!method) return;
    if (!reference.trim()) {
      setError("Ingresa el número de referencia de tu pago.");
      return;
    }
    if (!file) {
      setError("Sube una captura del comprobante.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const uploadForm = new FormData();
      uploadForm.set("bookingId", bookingId);
      uploadForm.set("file", file);
      const uploadRes = await fetch("/api/uploads/payment-proof", { method: "POST", body: uploadForm });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.url) {
        setError(uploadData.error ?? "No se pudo subir el comprobante.");
        return;
      }

      const submitRes = await fetch("/api/bookings/manual-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, method, reference, proofUrl: uploadData.url }),
      });
      const submitData = await submitRes.json();
      if (!submitRes.ok || !submitData.success) {
        setError(submitData.error ?? "No se pudo registrar el pago.");
        return;
      }

      setDone(true);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <p className="mb-0 text-sm text-gold-soft">
        Recibimos tu comprobante — Beto lo revisará y confirmará tu pago pronto.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="eyebrow">Pagar por Pago Móvil, Zelle o Binance</span>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(METHOD_LABEL) as ManualMethod[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            className={method === m ? "btn btn-gold" : "btn btn-ghost"}
          >
            {METHOD_LABEL[m]}
          </button>
        ))}
      </div>

      {method ? (
        <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-sm text-bone-dim">
            {method === "PAGO_MOVIL" ? (
              <ul className="mb-0 flex flex-col gap-1">
                <li>
                  Teléfono: <span className="text-bone">{instructions.pagoMovil.telefono}</span>
                </li>
                <li>
                  Cédula/RIF: <span className="text-bone">{instructions.pagoMovil.cedula}</span>
                </li>
                <li>
                  Banco: <span className="text-bone">{instructions.pagoMovil.banco}</span>
                </li>
              </ul>
            ) : method === "ZELLE" ? (
              <ul className="mb-0 flex flex-col gap-1">
                <li>
                  Correo: <span className="text-bone">{instructions.zelle.correo}</span>
                </li>
                <li>
                  Nombre: <span className="text-bone">{instructions.zelle.nombre}</span>
                </li>
              </ul>
            ) : (
              <ul className="mb-0 flex flex-col gap-1">
                <li>
                  Binance Pay ID: <span className="text-bone">{instructions.binance.id}</span>
                </li>
                <li>
                  Correo: <span className="text-bone">{instructions.binance.correo}</span>
                </li>
              </ul>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Número de referencia / operación
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-bone"
                placeholder="Ej. 000123456789"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Captura del comprobante
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm text-bone-dim"
                required
              />
            </label>
            <button type="submit" disabled={submitting} className="btn btn-gold self-start disabled:opacity-60">
              {submitting ? "Enviando..." : "Enviar comprobante"}
            </button>
            {error ? <p className="mb-0 text-sm text-ember">{error}</p> : null}
          </form>
        </div>
      ) : null}
    </div>
  );
}
