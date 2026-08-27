import "server-only";
import { prisma } from "@/lib/prisma";
import { expireStaleBookings } from "@/server/availability";
import { sendExpoPushToUser } from "@/server/expo-push";
import type { PaymentMethod } from "@prisma/client";

const MANUAL_METHODS: PaymentMethod[] = ["PAGO_MOVIL", "ZELLE", "BINANCE", "REMITLY", "WESTERN_UNION", "MONEYGRAM"];

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
  if (!reference.trim()) return { error: "Ingresa el número de referencia de tu pago." };
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
      manualPaymentReference: reference.trim(),
      manualPaymentProofUrl: proofUrl.trim(),
      paymentStatus: "PENDING",
    },
  });

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await Promise.all(
    admins.map((admin) =>
      sendExpoPushToUser(admin.id, {
        title: "Nuevo comprobante de pago",
        body: `Reserva #${booking.bookingNumber} — ${method} — esperando revisión.`,
        data: { type: "manual_payment_pending", bookingId },
      }).catch((err) => console.error("[expo-push] manual_payment_pending:", err)),
    ),
  );

  return { success: true };
}
