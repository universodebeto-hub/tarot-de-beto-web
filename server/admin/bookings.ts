import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { logAdminAction } from "@/server/audit";
import { expireStaleBookings } from "@/server/availability";
import { notifyPaymentConfirmed, notifyCancelled } from "@/server/notifications/send";
import { sendPushToTarotista } from "@/server/push-notifications";
import { sendExpoPushToUser } from "@/server/expo-push";
import { calculateOverage, CREDIT_MINUTES_CAP } from "@/server/credit-overage";
import { assignBookingNumberIfMissing } from "@/server/booking-number";
import { deleteBookingsWithDependents } from "@/server/booking-cleanup";
import { fundMinutesWalletIfApplicable } from "@/server/wallet";
import type { BookingStatus, PaymentStatus } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth/session";

export interface BookingFilters {
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  serviceId?: string;
  from?: string;
  to?: string;
  q?: string;
}

export async function listBookingsAdmin(filters: BookingFilters) {
  await expireStaleBookings();

  // Cada palabra por separado (AND entre palabras, OR entre campos por
  // palabra) -- así "victor bracho" encuentra a alguien con
  // firstName="Victor"/lastName="Bracho", que un solo `contains` de la
  // frase completa nunca hubiera encontrado.
  const words = filters.q?.trim().split(/\s+/).filter(Boolean) ?? [];

  return prisma.booking.findMany({
    where: {
      status: filters.status,
      paymentStatus: filters.paymentStatus,
      serviceId: filters.serviceId || undefined,
      startsAt: {
        gte: filters.from ? new Date(filters.from) : undefined,
        lte: filters.to ? new Date(`${filters.to}T23:59:59`) : undefined,
      },
      AND: words.map((word) => ({
        OR: [
          { bookingNumber: { contains: word, mode: "insensitive" as const } },
          { guestName: { contains: word, mode: "insensitive" as const } },
          { guestEmail: { contains: word, mode: "insensitive" as const } },
          { user: { firstName: { contains: word, mode: "insensitive" as const } } },
          { user: { lastName: { contains: word, mode: "insensitive" as const } } },
          { user: { email: { contains: word, mode: "insensitive" as const } } },
        ],
      })),
    },
    include: { service: true, user: true, tarotista: true },
    orderBy: { startsAt: "desc" },
    take: 200,
  });
}

export async function getBookingAdminById(id: string) {
  return prisma.booking.findUnique({
    where: { id },
    include: {
      service: true,
      user: true,
      transactions: true,
      tarotista: true,
      callLogs: { orderBy: { startedAt: "desc" } },
    },
  });
}

const ALLOWED_TRANSITIONS: Record<string, BookingStatus[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "RESCHEDULE_REQUESTED"],
  RESCHEDULE_REQUESTED: ["CONFIRMED", "CANCELLED"],
};

export async function setBookingStatus(
  bookingId: string,
  next: BookingStatus,
  currentUser?: CurrentUser | null,
): Promise<{ error?: string }> {
  const admin = await requireAdmin(currentUser);

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true, user: true, callLogs: true },
  });
  if (!booking) return { error: "Reserva no encontrada." };

  const allowed = ALLOWED_TRANSITIONS[booking.status] ?? [];
  if (!allowed.includes(next)) {
    return { error: `No se puede pasar de ${booking.status} a ${next}.` };
  }

  // "UNPAID" cubre el caso de siempre (PayPal todavía no capturado); "PENDING"
  // cubre un pago manual (Pago Móvil/Zelle/Binance) con comprobante ya
  // subido y esperando esta misma revisión — ver server/manual-payments.ts.
  const willMarkPaid =
    next === "CONFIRMED" && (booking.paymentStatus === "UNPAID" || booking.paymentStatus === "PENDING");

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: next,
      paymentStatus: willMarkPaid ? "PAID" : undefined,
      paidAt: willMarkPaid ? new Date() : undefined,
    },
  });

  // El número correlativo (BETO-<año>-NNNNN) recién se asigna acá -- ver
  // server/booking-number.ts. Antes de esto la reserva tenía un marcador
  // temporal que no consume ningún valor de la serie, para que ese
  // correlativo solo cuente reservas que de verdad se pagaron.
  if (willMarkPaid) {
    // Se pisa en el objeto en memoria para que las notificaciones de abajo
    // (que ya usan esta misma variable `booking`) muestren el número real,
    // no el marcador temporal con el que se creó la reserva.
    booking.bookingNumber = await assignBookingNumberIfMissing(bookingId, booking.bookingNumber);
    await fundMinutesWalletIfApplicable(booking);
  }

  // Liquidación de "Créditos Beto": recién al marcar la consulta como
  // terminada se sabe cuánto duró de verdad la llamada, así que es acá
  // donde se suman los minutos consumidos y se cobra el excedente (si lo
  // hubo) a la cuenta corriente del cliente -- ver server/credit-overage.ts.
  // Nunca se re-liquida: COMPLETED no tiene transición de salida en
  // ALLOWED_TRANSITIONS, así que esto corre una sola vez por reserva.
  if (next === "COMPLETED" && booking.paymentMethod === "CREDITO_BETO" && booking.userId) {
    const totalMinutes = Math.round(
      booking.callLogs.reduce(
        (sum, log) =>
          sum + (log.connectedAt && log.endedAt ? Math.max(0, (log.endedAt.getTime() - log.connectedAt.getTime()) / 60000) : 0),
        0,
      ),
    );
    const { overageMinutes, overageCost } = await calculateOverage(booking.service.durationMinutes, totalMinutes);
    const minutesToAdd = booking.service.durationMinutes + overageMinutes;
    const amountToAdd = Number(booking.service.price) + overageCost;

    const updatedUser = await prisma.user.update({
      where: { id: booking.userId },
      data: {
        creditMinutesAccumulated: { increment: minutesToAdd },
        creditAmountOwed: { increment: amountToAdd },
      },
    });

    if (updatedUser.creditMinutesAccumulated >= CREDIT_MINUTES_CAP && !updatedUser.creditPaused) {
      await prisma.user.update({ where: { id: booking.userId }, data: { creditPaused: true } });
      await logAdminAction({
        adminId: admin.id,
        action: "client.credit_auto_paused",
        targetType: "User",
        targetId: booking.userId,
        details: `${updatedUser.creditMinutesAccumulated} min acumulados`,
      });
    }
  }

  await logAdminAction({
    adminId: admin.id,
    action: "booking.status_change",
    targetType: "Booking",
    targetId: bookingId,
    details: `${booking.status} → ${next}`,
  });

  if (willMarkPaid) {
    await notifyPaymentConfirmed(booking).catch((err) => console.error("[notify] payment_confirmed:", err));
    if (booking.tarotistaId) {
      await sendPushToTarotista(booking.tarotistaId, {
        title: "Consulta habilitada",
        body: `Pago confirmado — ${booking.service.name} (#${booking.bookingNumber}).`,
        url: "/panel-tarotista",
      }).catch((err) => console.error("[push] payment_confirmed:", err));
    }
    if (booking.userId) {
      await sendExpoPushToUser(booking.userId, {
        title: "Pago confirmado",
        body: `Tu consulta de ${booking.service.name} ya está habilitada.`,
        data: { type: "payment_confirmed", bookingId },
      }).catch((err) => console.error("[expo-push] payment_confirmed:", err));
    }
  } else if (next === "CANCELLED") {
    await notifyCancelled(booking).catch((err) => console.error("[notify] cancelled:", err));
    if (booking.userId) {
      await sendExpoPushToUser(booking.userId, {
        title: "Reserva cancelada",
        body: `Tu reserva de ${booking.service.name} (#${booking.bookingNumber}) fue cancelada.`,
        data: { type: "booking_cancelled", bookingId },
      }).catch((err) => console.error("[expo-push] booking_cancelled:", err));
    }
  }

  return {};
}

export interface DeleteBookingResult {
  error?: string;
}

/**
 * Borra una reserva y todo lo que dependa de ella (mensajes, registros de
 * llamada, transacciones PayPal) -- a diferencia de "Cancelar" (que solo
 * cambia el estado y conserva el registro), esto es irreversible y no deja
 * rastro. Pensado para limpiar datos de prueba o duplicados, no para el uso
 * diario -- cancelar sigue siendo la opción correcta para una reserva real
 * que el cliente ya no quiere.
 */
export async function deleteBookingPermanently(
  bookingId: string,
  currentUser?: CurrentUser | null,
): Promise<DeleteBookingResult> {
  const admin = await requireAdmin(currentUser);

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { error: "Reserva no encontrada." };

  await prisma.$transaction([
    prisma.message.deleteMany({ where: { bookingId } }),
    prisma.callLog.deleteMany({ where: { bookingId } }),
    prisma.paypalTransaction.deleteMany({ where: { bookingId } }),
    prisma.booking.delete({ where: { id: bookingId } }),
  ]);

  await logAdminAction({
    adminId: admin.id,
    action: "booking.deleted",
    targetType: "Booking",
    targetId: bookingId,
    details: `#${booking.bookingNumber}`,
  });

  return {};
}

export interface SetManualMinutesAdjustmentResult {
  error?: string;
}

/**
 * Corrección manual de minutos consumidos (puede ser negativa) -- para
 * cuando hubo un problema real de conexión (ej. la llamada contó timbrando
 * sin que contesten, o un corte de red a mitad de consulta) que el conteo
 * automático (CallLog.connectedAt -> endedAt, ver server/admin/call-usage.ts)
 * no pudo resolver solo. No toca CallLog ni el gating de nada, solo suma/
 * resta al total que se muestra en el informe de consumo.
 */
export async function setManualMinutesAdjustment(
  bookingId: string,
  minutes: number,
  currentUser?: CurrentUser | null,
): Promise<SetManualMinutesAdjustmentResult> {
  const admin = await requireAdmin(currentUser);
  if (!Number.isFinite(minutes)) return { error: "Ingresá un número válido." };

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { error: "Reserva no encontrada." };

  await prisma.booking.update({ where: { id: bookingId }, data: { manualMinutesAdjustment: Math.round(minutes) } });
  await logAdminAction({
    adminId: admin.id,
    action: "booking.manual_minutes_adjusted",
    targetType: "Booking",
    targetId: bookingId,
    details: `${Math.round(minutes)} min`,
  });

  return {};
}

export interface SetCreditPaidResult {
  error?: string;
}

/**
 * Bookkeeping propio de Beto: marca si una reserva a crédito (paymentMethod
 * CREDITO_BETO) ya fue cobrada. A propósito NO toca status/paymentStatus --
 * esos ya se movieron a CONFIRMED/PAID cuando Beto aprobó la consulta (ver
 * setBookingStatus), que es lo único que gatea chat/audio/llamada. Esto es
 * solo para que Beto lleve la cuenta de a quién todavía le falta cobrar.
 */
export async function setCreditPaid(
  bookingId: string,
  paid: boolean,
  currentUser?: CurrentUser | null,
): Promise<SetCreditPaidResult> {
  const admin = await requireAdmin(currentUser);

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { error: "Reserva no encontrada." };
  if (booking.paymentMethod !== "CREDITO_BETO") {
    return { error: "Esta reserva no es un pago a crédito." };
  }

  await prisma.booking.update({ where: { id: bookingId }, data: { creditPaid: paid } });
  await logAdminAction({
    adminId: admin.id,
    action: paid ? "booking.credit_marked_paid" : "booking.credit_marked_unpaid",
    targetType: "Booking",
    targetId: bookingId,
  });

  return {};
}

export interface CleanupIncompleteBookingsResult {
  deleted?: number;
  error?: string;
}

/**
 * Botón manual del panel admin para borrar de una vez las reservas que
 * nunca se concretaron: expiradas, canceladas sin haberse pagado, o cuyo
 * plazo de pago ya venció. `expireStaleBookings` (server/availability.ts)
 * ya hace esto mismo automáticamente cada vez que se lee una reserva, así
 * que en producción esto queda al día solo -- este botón es para forzarlo
 * ya mismo (ej. limpiar datos de prueba) sin esperar a que alguien abra
 * esa reserva.
 */
export async function cleanupIncompleteBookings(
  currentUser?: CurrentUser | null,
): Promise<CleanupIncompleteBookingsResult> {
  const admin = await requireAdmin(currentUser);

  const toDelete = await prisma.booking.findMany({
    where: {
      OR: [
        { status: "EXPIRED" },
        { status: "PENDING_PAYMENT", paymentDeadline: { lt: new Date() } },
        { status: "CANCELLED", paymentStatus: { not: "PAID" } },
      ],
    },
    select: { id: true },
  });
  const deletedCount = await deleteBookingsWithDependents(toDelete.map((b) => b.id));

  await logAdminAction({
    adminId: admin.id,
    action: "booking.cleanup_incomplete",
    targetType: "Booking",
    targetId: "bulk",
    details: `${deletedCount} reservas eliminadas`,
  });

  return { deleted: deletedCount };
}

export async function addBookingNote(
  bookingId: string,
  note: string,
  currentUser?: CurrentUser | null,
): Promise<{ error?: string }> {
  const admin = await requireAdmin(currentUser);
  if (!note.trim()) return { error: "La nota no puede estar vacía." };

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { error: "Reserva no encontrada." };

  const stamp = `[${new Date().toISOString()}] ${admin.firstName}: ${note.trim()}`;
  const notes = booking.notes ? `${booking.notes}\n${stamp}` : stamp;

  await prisma.booking.update({ where: { id: bookingId }, data: { notes } });
  await logAdminAction({
    adminId: admin.id,
    action: "booking.note_added",
    targetType: "Booking",
    targetId: bookingId,
  });

  return {};
}
