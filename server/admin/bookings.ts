import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { logAdminAction } from "@/server/audit";
import { expireStaleBookings } from "@/server/availability";
import { notifyPaymentConfirmed, notifyCancelled } from "@/server/notifications/send";
import { sendPushToTarotista } from "@/server/push-notifications";
import type { BookingStatus } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth/session";

export interface BookingFilters {
  status?: BookingStatus;
  serviceId?: string;
  from?: string;
  to?: string;
  q?: string;
}

export async function listBookingsAdmin(filters: BookingFilters) {
  await expireStaleBookings();

  return prisma.booking.findMany({
    where: {
      status: filters.status,
      serviceId: filters.serviceId || undefined,
      startsAt: {
        gte: filters.from ? new Date(filters.from) : undefined,
        lte: filters.to ? new Date(`${filters.to}T23:59:59`) : undefined,
      },
      ...(filters.q
        ? {
            OR: [
              { bookingNumber: { contains: filters.q, mode: "insensitive" } },
              { guestName: { contains: filters.q, mode: "insensitive" } },
              { guestEmail: { contains: filters.q, mode: "insensitive" } },
              { user: { firstName: { contains: filters.q, mode: "insensitive" } } },
              { user: { email: { contains: filters.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { service: true, user: true, tarotista: true },
    orderBy: { startsAt: "desc" },
    take: 200,
  });
}

export async function getBookingAdminById(id: string) {
  return prisma.booking.findUnique({
    where: { id },
    include: { service: true, user: true, transactions: true, tarotista: true },
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
    include: { service: true, user: true },
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
    },
  });

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
  } else if (next === "CANCELLED") {
    await notifyCancelled(booking).catch((err) => console.error("[notify] cancelled:", err));
  }

  return {};
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
