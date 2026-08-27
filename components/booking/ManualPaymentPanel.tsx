"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ManualPaymentInstructions } from "@/server/settings";
import { PAYMENT_METHOD_LABEL, PAYMENT_METHOD_LOGO_SLUG } from "@/lib/booking-labels";

type ManualMethod = "PAGO_MOVIL" | "ZELLE" | "BINANCE" | "REMITLY" | "WESTERN_UNION" | "MONEYGRAM";

const MANUAL_METHODS: ManualMethod[] = ["PAGO_MOVIL", "ZELLE", "BINANCE", "REMITLY", "WESTERN_UNION", "MONEYGRAM"];

interface ManualPaymentPanelProps {
  bookingId: string;
  instructions: ManualPaymentInstructions;
}

/**
 * Alternativa a PayPal para quienes pagan por transferencia/envío de dinero:
 * sin pasarela, así que no hay confirmación automática — el cliente
 * transfiere, sube su comprobante, y Beto lo revisa y confirma manualmente
 * desde el panel (ver server/manual-payments.ts, app/admin/reservas/[id]/page.tsx).
 * Cada método se muestra como un botón cuadrado con su logo, todos del
 * mismo tamaño — ver public/assets/payment-logos/.
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
      <span className="eyebrow">Elige un método de pago</span>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {MANUAL_METHODS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            aria-label={PAYMENT_METHOD_LABEL[m]}
            className={`flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border p-2 transition-colors ${
              method === m ? "border-gold bg-gold/10" : "border-white/15 bg-white/5 hover:border-white/30"
            }`}
          >
            <Image
              src={`/assets/payment-logos/${PAYMENT_METHOD_LOGO_SLUG[m]}.png`}
              alt={PAYMENT_METHOD_LABEL[m]}
              width={56}
              height={56}
              className="rounded-lg"
            />
            <span className="text-center font-mono text-[9.5px] uppercase leading-tight tracking-wide text-ash">
              {PAYMENT_METHOD_LABEL[m]}
            </span>
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
            ) : method === "BINANCE" ? (
              <ul className="mb-0 flex flex-col gap-1">
                <li>
                  Binance Pay ID: <span className="text-bone">{instructions.binance.id}</span>
                </li>
                <li>
                  Correo: <span className="text-bone">{instructions.binance.correo}</span>
                </li>
              </ul>
            ) : (
              <ul className="mb-0 flex flex-col gap-1">
                <li>
                  Nombre del destinatario:{" "}
                  <span className="text-bone">
                    {method === "REMITLY"
                      ? instructions.remitly.nombre
                      : method === "WESTERN_UNION"
                        ? instructions.westernUnion.nombre
                        : instructions.moneygram.nombre}
                  </span>
                </li>
                <li>
                  País:{" "}
                  <span className="text-bone">
                    {method === "REMITLY"
                      ? instructions.remitly.pais
                      : method === "WESTERN_UNION"
                        ? instructions.westernUnion.pais
                        : instructions.moneygram.pais}
                  </span>
                </li>
                <li>
                  Teléfono:{" "}
                  <span className="text-bone">
                    {method === "REMITLY"
                      ? instructions.remitly.telefono
                      : method === "WESTERN_UNION"
                        ? instructions.westernUnion.telefono
                        : instructions.moneygram.telefono}
                  </span>
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
