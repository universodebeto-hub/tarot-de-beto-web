import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Informe interno: por cada consulta pagada, cuántos minutos pagó el
 * cliente (Service.durationMinutes) contra cuántos minutos realmente
 * consumió en llamadas (suma de CallLog.endedAt - connectedAt para esa
 * reserva, más Booking.manualMinutesAdjustment) -- ver
 * server/calls.ts::getCallAccess/markCallConnected/endCall, que son
 * quienes escriben esos registros. Se cuenta desde `connectedAt` (cuándo
 * la OTRA persona realmente entró a la sala), nunca desde `startedAt`
 * (cuándo se pidió el token) -- si nadie contestó, `connectedAt` queda
 * null y esa llamada no suma minutos, aunque haya quedado "timbrando" un
 * rato largo antes de colgar. Sirve para detectar consultas de 1 hora
 * pagada que terminaron usando, por ejemplo, 40 minutos.
 */
export interface CallUsageBookingRow {
  id: string;
  bookingNumber: string;
  serviceName: string;
  startsAt: Date;
  minutesPaid: number;
  /** Ya incluye manualAdjustmentMinutes -- lo que hay que comparar contra minutesPaid. */
  minutesConsumed: number;
  /** Parte de minutesConsumed que viene de la corrección manual del admin (puede ser negativa), para mostrarla aparte en la UI. */
  manualAdjustmentMinutes: number;
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

function callDurationMinutes(callLogs: { connectedAt: Date | null; endedAt: Date | null }[]): number {
  const totalSeconds = callLogs.reduce((sum, log) => {
    // Nadie contestó (o el otro lado nunca llegó a conectarse) -- no cuenta.
    if (!log.connectedAt || !log.endedAt) return sum;
    return sum + Math.max(0, (log.endedAt.getTime() - log.connectedAt.getTime()) / 1000);
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
      minutesConsumed: Math.max(0, callDurationMinutes(b.callLogs) + b.manualMinutesAdjustment),
      manualAdjustmentMinutes: b.manualMinutesAdjustment,
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
