import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Informe interno: por cada consulta pagada, cuántos minutos pagó el
 * cliente (Service.durationMinutes) contra cuántos minutos realmente
 * consumió en llamadas (suma de CallLog.endedAt - startedAt para esa
 * reserva) -- ver server/calls.ts::getCallAccess/endCall, que son quienes
 * escriben esos registros. Sirve para detectar consultas de 1 hora pagada
 * que terminaron usando, por ejemplo, 40 minutos.
 */
export interface CallUsageBookingRow {
  id: string;
  bookingNumber: string;
  serviceName: string;
  startsAt: Date;
  minutesPaid: number;
  minutesConsumed: number;
  callCount: number;
}

export interface CallUsageClientGroup {
  clientKey: string;
  clientName: string;
  clientEmail: string | null;
  totalMinutesPaid: number;
  totalMinutesConsumed: number;
  bookings: CallUsageBookingRow[];
}

function callDurationMinutes(callLogs: { startedAt: Date; endedAt: Date | null }[]): number {
  const totalSeconds = callLogs.reduce((sum, log) => {
    if (!log.endedAt) return sum;
    return sum + Math.max(0, (log.endedAt.getTime() - log.startedAt.getTime()) / 1000);
  }, 0);
  return Math.round(totalSeconds / 60);
}

/** `tarotistaId` opcional -- sin él, es el informe completo (panel admin); con él, solo las consultas de ese tarotista (su propio panel). */
export async function getCallUsageReport(tarotistaId?: string): Promise<CallUsageClientGroup[]> {
  const bookings = await prisma.booking.findMany({
    where: {
      tarotistaId: tarotistaId ?? { not: null },
      paymentStatus: "PAID",
    },
    include: { service: true, user: true, callLogs: true },
    orderBy: { startsAt: "desc" },
  });

  const groups = new Map<string, CallUsageClientGroup>();

  for (const b of bookings) {
    const clientKey = b.userId ?? b.guestEmail ?? b.id;
    const clientName = b.user ? `${b.user.firstName} ${b.user.lastName ?? ""}`.trim() : (b.guestName ?? "Invitado");
    const clientEmail = b.user?.email ?? b.guestEmail ?? null;

    const row: CallUsageBookingRow = {
      id: b.id,
      bookingNumber: b.bookingNumber,
      serviceName: b.service.name,
      startsAt: b.startsAt,
      minutesPaid: b.service.durationMinutes,
      minutesConsumed: callDurationMinutes(b.callLogs),
      callCount: b.callLogs.length,
    };

    const existing = groups.get(clientKey);
    if (existing) {
      existing.bookings.push(row);
      existing.totalMinutesPaid += row.minutesPaid;
      existing.totalMinutesConsumed += row.minutesConsumed;
    } else {
      groups.set(clientKey, {
        clientKey,
        clientName,
        clientEmail,
        totalMinutesPaid: row.minutesPaid,
        totalMinutesConsumed: row.minutesConsumed,
        bookings: [row],
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.totalMinutesPaid - a.totalMinutesPaid);
}
