import "server-only";
import { prisma } from "@/lib/prisma";
import { expireStaleBookings } from "@/server/availability";
import { notifyAdminsPendingApproval } from "@/server/notifications/send";
import type { PaymentMethod } from "@prisma/client";

const MANUAL_METHODS: PaymentMethod[] = [
  "PAGO_MOVIL",
  "ZELLE",
  "BINANCE",
  "REMITLY",
  "WESTERN_UNION",
  "MONEYGRAM",
  "BANCOLOMBIA",
];

export interface ManualPaymentResult {
  success?: boolean;
  error?: string;
}

/**
 * Registra el comprobante de un pago manual (Pago Móvil/Zelle/Binance) para
 * que el admin lo revise y confirme desde el panel — no marca la reserva
 * como pagada por sí solo (a diferencia de PayPal, acá no hay forma de
 * verificar el pago automáticamente). Deja paymentStatus en PENDING como
 * señal de "hay un comprobante esperando revisión", distinto de UNPAID
 * (todavía no eligió cómo pagar).
 */
export async function submitManualPaymentProof(
  bookingId: string,
  method: PaymentMethod,
  reference: string,
  proofUrl: string,
): Promise<ManualPaymentResult> {
  if (!MANUAL_METHODS.includes(method)) return { error: "Método de pago inválido." };
  if (!proofUrl.trim()) return { error: "Sube una captura del comprobante." };

  await expireStaleBookings();

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { error: "Reserva no encontrada." };
  if (booking.status !== "PENDING_PAYMENT") {
    return { error: "Esta reserva ya no está pendiente de pago." };
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      paymentMethod: method,
      manualPaymentReference: reference.trim() || null,
      manualPaymentProofUrl: proofUrl.trim(),
      paymentStatus: "PENDING",
    },
  });

  await notifyAdminsPendingApproval({
    title: "Nuevo comprobante de pago",
    body: `Reserva #${booking.bookingNumber} — ${method} — esperando revisión.`,
    bookingId,
    pushType: "manual_payment_pending",
  });

  return { success: true };
}
