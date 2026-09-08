import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { logAdminAction } from "@/server/audit";
import { nextBookingNumber } from "@/server/booking-number";
import { isReportOnlyService } from "@/lib/service-fulfillment";
import { notifyBookingReceived } from "@/server/notifications/send";
import { sendExpoPushToUser } from "@/server/expo-push";
import type { CurrentUser } from "@/lib/auth/session";

export interface GrantComplimentaryConsultationResult {
  error?: string;
  bookingId?: string;
}

/**
 * Regala una consulta a un cliente (ej. para reactivar a alguien inactivo):
 * crea la reserva ya CONFIRMED + PAID, con paymentMethod CORTESIA, sin
 * pasar por ningún flujo de pago real. Reutiliza el mismo gating de
 * chat/audio/llamada de siempre (status CONFIRMED + paymentStatus PAID) --
 * no se toca esa lógica, esto solo la deja ya cumplida de entrada.
 */
export async function grantComplimentaryConsultation(
  clientId: string,
  serviceId: string,
  tarotistaId: string | null,
  currentUser?: CurrentUser | null,
): Promise<GrantComplimentaryConsultationResult> {
  const admin = await requireAdmin(currentUser);

  const client = await prisma.user.findUnique({ where: { id: clientId, role: "CLIENT" } });
  if (!client) return { error: "Cliente no encontrado." };

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return { error: "Servicio no encontrado." };

  const isReport = isReportOnlyService(service.slug);
  if (!isReport) {
    if (!tarotistaId) return { error: "Elegí un tarotista para atender la consulta." };
    const tarotista = await prisma.tarotista.findUnique({ where: { id: tarotistaId } });
    if (!tarotista) return { error: "Tarotista no encontrado." };
  }

  const now = new Date();
  const endsAt = isReport ? now : new Date(now.getTime() + service.durationMinutes * 60_000);
  const bookingNumber = await nextBookingNumber();

  const booking = await prisma.booking.create({
    data: {
      bookingNumber,
      userId: clientId,
      serviceId,
      tarotistaId: isReport ? null : tarotistaId,
      startsAt: now,
      endsAt,
      status: "CONFIRMED",
      paymentStatus: "PAID",
      paymentMethod: "CORTESIA",
      paymentDeadline: now,
      paidAt: now,
    },
    include: { service: true, user: true },
  });

  await logAdminAction({
    adminId: admin.id,
    action: "client.gifted_consultation",
    targetType: "Booking",
    targetId: booking.id,
    details: `${client.email} · ${service.name}`,
  });

  await notifyBookingReceived(booking).catch((err) => console.error("[notify] gifted_consultation:", err));
  await sendExpoPushToUser(clientId, {
    title: "¡Tenés una consulta de regalo!",
    body: `Beto te regaló ${service.name} -- ya está lista para usar.`,
    data: { type: "payment_confirmed", bookingId: booking.id },
  }).catch((err) => console.error("[expo-push] gifted_consultation:", err));

  return { bookingId: booking.id };
}
