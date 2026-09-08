"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ManualPaymentInstructions } from "@/server/settings";
import { PAYMENT_METHOD_LABEL, PAYMENT_METHOD_LOGO_SLUG } from "@/lib/booking-labels";
import { PayPalButton } from "@/components/booking/PayPalButton";
import { requestCreditBookingAction } from "@/app/reservas/[id]/credit-actions";
import { buildWhatsAppLink } from "@/config/site";

type ManualMethod = "PAGO_MOVIL" | "ZELLE" | "BINANCE" | "REMITLY" | "WESTERN_UNION" | "MONEYGRAM" | "BANCOLOMBIA";
/** "PAYPAL" y "CREDITO_BETO" solo existen acá para la selección visual -- ninguna se manda a /api/bookings/manual-payment: PAYPAL dispara el checkout de PayPalButton, CREDITO_BETO llama a requestCreditBookingAction (sin comprobante). */
type PickableMethod = ManualMethod | "PAYPAL" | "CREDITO_BETO";

const MANUAL_METHODS: ManualMethod[] = [
  "PAGO_MOVIL",
  "ZELLE",
  "BINANCE",
  "REMITLY",
  "WESTERN_UNION",
  "MONEYGRAM",
  "BANCOLOMBIA",
];

interface ManualPaymentPanelProps {
  bookingId: string;
  instructions: ManualPaymentInstructions;
  /** Si viene configurado, PayPal aparece como opción extra en la misma grilla. */
  paypal?: { clientId: string; currency: string } | null;
  /** Solo true si Beto ya habilitó esta cuenta para pagar a crédito (User.canUseCredit) -- si no, "Créditos Beto" ni aparece. */
  creditEnabled?: boolean;
  bookingNumber: string;
  /** Número de WhatsApp de Beto -- botón de respaldo si falla la subida del comprobante. */
  whatsappNumber?: string;
}

/**
 * Alternativa a PayPal para quienes pagan por transferencia/envío de dinero:
 * sin pasarela, así que no hay confirmación automática — el cliente
 * transfiere, sube su comprobante, y Beto lo revisa y confirma manualmente
 * desde el panel (ver server/manual-payments.ts, app/admin/reservas/[id]/page.tsx).
 * Cada método se muestra como un botón cuadrado con su logo, todos del
 * mismo tamaño — ver public/assets/payment-logos/.
 */
export function ManualPaymentPanel({
  bookingId,
  instructions,
  paypal,
  creditEnabled,
  bookingNumber,
  whatsappNumber,
}: ManualPaymentPanelProps) {
  const router = useRouter();
  const [method, setMethod] = useState<PickableMethod | null>(null);
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"PROOF" | "CREDIT" | null>(null);

  async function handleCreditRequest() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await requestCreditBookingAction(bookingId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setDone("CREDIT");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!method || method === "PAYPAL" || method === "CREDITO_BETO") return;
    if (!file) {
      setError("Sube una captura del comprobante.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      // La subida directa a Vercel Blob (@vercel/blob/client) queda rechazada
      // en este store ("Access denied") -- probablemente una restricción de
      // red del plan actual, no algo que se arregle desde el código. Mientras
      // tanto, misma vía simple y ya probada que usa la app: el archivo pasa
      // por nuestro servidor (tope real de ~4 MB de Vercel), sin comprimir.
      const uploadForm = new FormData();
      uploadForm.set("bookingId", bookingId);
      uploadForm.set("file", file);
      const uploadRes = await fetch("/api/uploads/payment-proof", { method: "POST", body: uploadForm });
      // Si el archivo supera el límite real de Vercel para el body de una
      // función, la plataforma corta la petición ANTES de que nuestra ruta
      // corra -- la respuesta no siempre es el JSON que devuelve nuestro
      // propio chequeo de tamaño, así que .json() puede tirar un error acá.
      let uploadData: { url?: string; error?: string } = {};
      try {
        uploadData = await uploadRes.json();
      } catch {
        setError(
          uploadRes.status === 413
            ? "Esta captura pesa demasiado para subirla (máximo ~4 MB). Recortá la imagen a solo la parte del comprobante, o mandala directo a Beto por WhatsApp."
            : "No se pudo subir el comprobante. Intenta de nuevo o mandalo por WhatsApp.",
        );
        return;
      }
      if (!uploadRes.ok || !uploadData.url) {
        setError(uploadData.error ?? "No se pudo subir el comprobante.");
        return;
      }

      const submitRes = await fetch("/api/bookings/manual-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, method, reference, proofUrl: uploadData.url }),
      });
      let submitData: { success?: boolean; error?: string } = {};
      try {
        submitData = await submitRes.json();
      } catch {
        setError("No se pudo registrar el pago. Intenta de nuevo o mandalo por WhatsApp.");
        return;
      }
      if (!submitRes.ok || !submitData.success) {
        setError(submitData.error ?? "No se pudo registrar el pago.");
        return;
      }

      setDone("PROOF");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (done === "PROOF") {
    return (
      <p className="mb-0 text-sm text-gold-soft">
        Recibimos tu comprobante — Beto lo revisará y confirmará tu pago pronto.
      </p>
    );
  }
  if (done === "CREDIT") {
    return (
      <p className="mb-0 text-sm text-gold-soft">
        Recibimos tu solicitud — Beto la revisará y habilitará tu consulta a crédito pronto.
      </p>
    );
  }

  const manualMethods: PickableMethod[] = [...MANUAL_METHODS, ...(creditEnabled ? (["CREDITO_BETO"] as const) : [])];

  return (
    <div className="flex flex-col gap-5">
      {paypal ? (
        <div className="flex flex-col gap-3">
          <span className="eyebrow">Pago con tarjeta</span>
          <button
            type="button"
            onClick={() => setMethod("PAYPAL")}
            className={`flex items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition-colors ${
              method === "PAYPAL" ? "border-gold/60 bg-gold/[0.08]" : "border-white/10 bg-white/[0.02] hover:border-gold/25"
            }`}
          >
            <span className="flex shrink-0 items-center gap-1.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white p-2">
                <Image src="/assets/payment-logos/paypal.png" alt="" width={32} height={32} className="h-full w-full object-contain" />
              </span>
              <span className="flex h-11 w-8 items-center justify-center rounded-lg bg-white/10">
                <svg viewBox="0 0 32 20" className="h-4 w-7">
                  <text x="16" y="14" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontWeight="700" fontSize="11" fill="#f7b600">
                    VISA
                  </text>
                </svg>
              </span>
              <span className="flex h-11 w-8 items-center justify-center rounded-lg bg-white/10">
                <svg viewBox="0 0 32 20" className="h-5 w-7">
                  <circle cx="13" cy="10" r="7" fill="#EB001B" />
                  <circle cx="21" cy="10" r="7" fill="#F79E1B" fillOpacity="0.9" />
                </svg>
              </span>
            </span>
            <span>
              <span className="block text-bone">Tarjeta de crédito o débito</span>
              <span className="block text-xs text-bone-dim">
                Visa, Mastercard u otra — no necesitás cuenta de PayPal, pagás como invitado
              </span>
            </span>
          </button>

          {method === "PAYPAL" ? (
            <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <PayPalButton clientId={paypal.clientId} currency={paypal.currency} bookingId={bookingId} />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <span className="eyebrow">Pago manual (transferencia)</span>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {manualMethods.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              aria-label={PAYMENT_METHOD_LABEL[m]}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl transition-all ${
                  method === m ? "ring-2 ring-gold ring-offset-2 ring-offset-obsidian" : "hover:brightness-110"
                }`}
              >
                <Image
                  src={`/assets/payment-logos/${PAYMENT_METHOD_LOGO_SLUG[m]}.png`}
                  alt={PAYMENT_METHOD_LABEL[m]}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </span>
              <span className="text-center font-mono text-[9.5px] uppercase leading-tight tracking-wide text-ash">
                {PAYMENT_METHOD_LABEL[m]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {method === "CREDITO_BETO" ? (
        <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="mb-0 text-sm text-bone-dim">
            Tu cuenta está habilitada para atenderte ahora y pagar después. Al solicitarlo, Beto revisa y habilita tu
            consulta — no necesitas subir ningún comprobante.
          </p>
          <button
            type="button"
            onClick={handleCreditRequest}
            disabled={submitting}
            className="btn btn-gold self-start disabled:opacity-60"
          >
            {submitting ? "Enviando..." : "Solicitar a crédito"}
          </button>
          {error ? <p className="mb-0 text-sm text-ember">{error}</p> : null}
        </div>
      ) : null}

      {method && method !== "PAYPAL" && method !== "CREDITO_BETO" ? (
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
            ) : method === "BANCOLOMBIA" ? (
              <ul className="mb-0 flex flex-col gap-1">
                <li>
                  Tipo de cuenta: <span className="text-bone">{instructions.bancolombia.tipoCuenta}</span>
                </li>
                <li>
                  Número de cuenta: <span className="text-bone">{instructions.bancolombia.numeroCuenta}</span>
                </li>
                <li>
                  Titular: <span className="text-bone">{instructions.bancolombia.titular}</span>
                </li>
                <li>
                  Cédula/NIT: <span className="text-bone">{instructions.bancolombia.cedulaONit}</span>
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
              Número de referencia / operación (opcional)
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-bone"
                placeholder="Ej. 000123456789"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Captura del comprobante
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="rounded-lg border border-white/15 bg-obsidian/60 px-3 py-2 text-sm text-bone file:mr-3 file:rounded-md file:border-0 file:bg-gold file:px-3 file:py-1.5 file:font-mono file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-obsidian"
                required
              />
              {file ? <span className="text-xs text-bone-dim">{file.name}</span> : null}
            </label>
            <button type="submit" disabled={submitting} className="btn btn-gold self-start disabled:opacity-60">
              {submitting ? "Enviando..." : "Enviar comprobante"}
            </button>
            {error ? <p className="mb-0 text-sm text-ember">{error}</p> : null}
            {error && whatsappNumber ? (
              <a
                href={buildWhatsAppLink(
                  whatsappNumber,
                  `Hola Beto, tuve un problema subiendo el comprobante de mi reserva ${bookingNumber} (${PAYMENT_METHOD_LABEL[method]}). Te mando la captura por acá.`,
                )}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost self-start"
              >
                Enviar comprobante por WhatsApp
              </a>
            ) : null}
          </form>
        </div>
      ) : null}
    </div>
  );
}
