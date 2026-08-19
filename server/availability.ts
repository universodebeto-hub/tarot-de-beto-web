import { prisma } from "@/lib/prisma";
import { getServiceById } from "@/server/services";
import { getSetting } from "@/server/settings";
import { businessDayOfWeek, businessLocalToUtc, formatMinutes } from "@/lib/timezone";

export interface TimeSlot {
  /** Instante UTC de inicio, en formato ISO — lo que se guarda en la reserva. */
  startUtc: string;
  endUtc: string;
  /** Hora local del negocio, para mostrar (ej. "14:30"). */
  label: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Pasa a EXPIRED cualquier reserva PENDING_PAYMENT cuyo plazo ya venció.
 * Verificación perezosa (no hay cron todavía): se llama antes de calcular
 * disponibilidad o crear una reserva, para no bloquear horarios con holds
 * que ya deberían haberse liberado.
 */
export async function expireStaleBookings(): Promise<void> {
  await prisma.booking.updateMany({
    where: { status: "PENDING_PAYMENT", paymentDeadline: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });
}

interface GetAvailableSlotsInput {
  serviceId: string;
  /** Fecha calendario (yyyy-mm-dd) en la zona horaria del negocio. */
  date: string;
}

/**
 * Calcula los horarios disponibles para un servicio en una fecha dada:
 * horario laboral (Availability) − bloqueos (BlockedTime) − reservas activas
 * (PENDING_PAYMENT/CONFIRMED) − duración del servicio − separación
 * configurable entre consultas.
 */
export async function getAvailableSlots({ serviceId, date }: GetAvailableSlotsInput): Promise<TimeSlot[]> {
  if (!DATE_RE.test(date)) return [];

  const service = await getServiceById(serviceId);
  if (!service || !service.available) return [];

  await expireStaleBookings();

  const dayStartUtc = businessLocalToUtc(date, 0);
  const dayEndUtc = businessLocalToUtc(date, 24 * 60);
  const dayOfWeek = businessDayOfWeek(dayStartUtc);

  const [ranges, blocks, activeBookings, bufferMinutes] = await Promise.all([
    prisma.availability.findMany({
      where: { dayOfWeek, active: true },
      orderBy: { startMinute: "asc" },
    }),
    prisma.blockedTime.findMany({
      where: { startsAt: { lt: dayEndUtc }, endsAt: { gt: dayStartUtc } },
    }),
    prisma.booking.findMany({
      where: {
        serviceId,
        status: { in: ["PENDING_PAYMENT", "CONFIRMED"] },
        startsAt: { lt: dayEndUtc },
        endsAt: { gt: dayStartUtc },
      },
    }),
    getSetting<number>("booking_buffer_minutes", 10),
  ]);

  if (ranges.length === 0) return [];

  const duration = service.durationMinutes;
  const step = duration + bufferMinutes;
  const now = new Date();
  const busyRanges = [...blocks, ...activeBookings.map((b) => ({ startsAt: b.startsAt, endsAt: b.endsAt }))];

  const slots: TimeSlot[] = [];

  for (const range of ranges) {
    for (let start = range.startMinute; start + duration <= range.endMinute; start += step) {
      const startUtc = businessLocalToUtc(date, start);
      const endUtc = businessLocalToUtc(date, start + duration);

      if (startUtc <= now) continue;

      const busy = busyRanges.some((b) => b.startsAt < endUtc && b.endsAt > startUtc);
      if (busy) continue;

      slots.push({ startUtc: startUtc.toISOString(), endUtc: endUtc.toISOString(), label: formatMinutes(start) });
    }
  }

  return slots;
}
