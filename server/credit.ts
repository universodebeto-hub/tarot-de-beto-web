import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { expireStaleBookings } from "@/server/availability";
import { sendExpoPushToUser } from "@/server/expo-push";
import type { CurrentUser } from "@/lib/auth/session";

export interface CreditRequestResult {
  success?: boolean;
  error?: string;
}

/**
 * "Créditos Beto": el cliente pide atenderse ahora y pagar después, sin
 * comprobante ni referencia (a diferencia de los métodos manuales en
 * server/manual-payments.ts). Solo disponible para cuentas que Beto ya
 * aprobó a mano (User.canUseCredit, ver server/admin/clients.ts). Deja la
 * reserva en paymentStatus PENDING -- Beto la aprueba o rechaza como
 * cualquier otro pago pendiente, desde el mismo botón "Confirmar" del
 * panel (server/admin/bookings.ts::setBookingStatus), que al pasar a
 * CONFIRMED marca paymentStatus PAID igual que con un comprobante manual.
 * Que Beto haya cobrado ese crédito de verdad se rastrea aparte con
 * Booking.creditPaid (ver setCreditPaid), sin tocar ese gating.
 */
export async function requestCreditBooking(
  bookingId: string,
  currentUser?: CurrentUser | null,
): Promise<CreditRequestResult> {
  const user = currentUser === undefined ? await getCurrentUser() : currentUser;
  if (!user) return { error: "Necesitas iniciar sesión." };
  if (!user.canUseCredit) {
    return { error: "Tu cuenta todavía no está habilitada para pagar a crédito." };
  }

  await expireStaleBookings();

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { error: "Reserva no encontrada." };
  if (booking.userId !== user.id) return { error: "Esta reserva no pertenece a tu cuenta." };
  if (booking.status !== "PENDING_PAYMENT") {
    return { error: "Esta reserva ya no está pendiente de pago." };
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      paymentMethod: "CREDITO_BETO",
      paymentStatus: "PENDING",
    },
  });

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await Promise.all(
    admins.map((admin) =>
      sendExpoPushToUser(admin.id, {
        title: "Solicitud de consulta a crédito",
        body: `Reserva #${booking.bookingNumber} — ${user.firstName} pidió pagar a crédito.`,
        data: { type: "credit_request_pending", bookingId },
      }).catch((err) => console.error("[expo-push] credit_request_pending:", err)),
    ),
  );

  return { success: true };
}
