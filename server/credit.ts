import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAdmin } from "@/lib/auth/session";
import { expireStaleBookings } from "@/server/availability";
import { notifyAdminsPendingApproval } from "@/server/notifications/send";
import { logAdminAction } from "@/server/audit";
import { CREDIT_MINUTES_CAP } from "@/server/credit-overage";
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

  // Se lee de nuevo de la base (no del `currentUser` de la sesión) porque
  // un pausado reciente debe bloquear ya mismo, sin esperar a que la
  // persona vuelva a iniciar sesión.
  const freshUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (freshUser?.creditPaused) {
    return {
      error: "Tu crédito está pausado por ahora -- escribile a Beto para regularizar el pago pendiente antes de pedir otra consulta a crédito.",
    };
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

  await notifyAdminsPendingApproval({
    title: "Solicitud de consulta a crédito",
    body: `Reserva #${booking.bookingNumber} — ${user.firstName} pidió pagar a crédito.`,
    bookingId,
    pushType: "credit_request_pending",
  });

  return { success: true };
}

export interface CreditStatus {
  minutesAccumulated: number;
  minutesCap: number;
  amountOwed: number;
  paused: boolean;
}

/** Estado de la cuenta corriente de crédito -- usado tanto en el panel admin (por cliente) como en la cuenta del propio cliente ("Pagos pendientes"). */
export async function getCreditStatus(userId: string): Promise<CreditStatus> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return {
    minutesAccumulated: user.creditMinutesAccumulated,
    minutesCap: CREDIT_MINUTES_CAP,
    amountOwed: Number(user.creditAmountOwed),
    paused: user.creditPaused,
  };
}

export interface CreditActionResult {
  error?: string;
}

/** El admin pausa el crédito de un cliente a mano, en cualquier momento -- no espera al tope de minutos. */
export async function pauseUserCredit(userId: string, currentUser?: CurrentUser | null): Promise<CreditActionResult> {
  const admin = await requireAdmin(currentUser);
  await prisma.user.update({ where: { id: userId }, data: { creditPaused: true } });
  await logAdminAction({ adminId: admin.id, action: "client.credit_paused", targetType: "User", targetId: userId });
  return {};
}

/** Reactiva el crédito sin tocar el saldo pendiente -- para cuando el admin quiere darle otra vuelta de confianza antes de que pague todo. */
export async function resumeUserCredit(userId: string, currentUser?: CurrentUser | null): Promise<CreditActionResult> {
  const admin = await requireAdmin(currentUser);
  await prisma.user.update({ where: { id: userId }, data: { creditPaused: false } });
  await logAdminAction({ adminId: admin.id, action: "client.credit_resumed", targetType: "User", targetId: userId });
  return {};
}

/** Salda la cuenta: minutos y monto vuelven a cero, y se reactiva si estaba pausado -- también marca como cobradas (Booking.creditPaid) todas las reservas a crédito de este cliente que todavía no lo estaban, para no dejar dos fuentes de verdad desincronizadas. */
export async function markUserCreditPaid(userId: string, currentUser?: CurrentUser | null): Promise<CreditActionResult> {
  const admin = await requireAdmin(currentUser);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { creditMinutesAccumulated: 0, creditAmountOwed: 0, creditPaused: false },
    }),
    prisma.booking.updateMany({
      where: { userId, paymentMethod: "CREDITO_BETO", creditPaid: false },
      data: { creditPaid: true },
    }),
  ]);

  await logAdminAction({ adminId: admin.id, action: "client.credit_settled", targetType: "User", targetId: userId });
  return {};
}
