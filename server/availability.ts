import { prisma } from "@/lib/prisma";
import { getServiceById } from "@/server/services";
import { getSetting } from "@/server/settings";
import { businessDayOfWeek, businessLocalToUtc, formatMinutes } from "@/lib/timezone";

export interface TimeSlot {
  /** Instante UTC de inicio, en formato ISO — lo que se guardará en la reserva (Fase 5). */
  startUtc: string;
  endUtc: string;
  /** Hora local del negocio, para mostrar (ej. "14:30"). */
  label: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface GetAvailableSlotsInput {
  serviceId: string;
  /** Fecha calendario (yyyy-mm-dd) en la zona horaria del negocio. */
  date: string;
}

/**
 * Calcula los horarios disponibles para un servicio en una fecha dada:
 * horario laboral (Availability) − bloqueos (BlockedTime) − duración del
 * servicio − separación configurable entre consultas.
 *
 * Nota: todavía NO descuenta reservas ya confirmadas/pendientes de pago,
 * porque el modelo `Booking` se crea en la Fase 5. Cuando exista, este
 * motor debe excluir también esos rangos para evitar doble reserva.
 */
export async function getAvailableSlots({ serviceId, date }: GetAvailableSlotsInput): Promise<TimeSlot[]> {
  if (!DATE_RE.test(date)) return [];

  const service = await getServiceById(serviceId);
  if (!service || !service.available) return [];

  const dayStartUtc = businessLocalToUtc(date, 0);
  const dayEndUtc = businessLocalToUtc(date, 24 * 60);
  const dayOfWeek = businessDayOfWeek(dayStartUtc);

  const [ranges, blocks, bufferMinutes] = await Promise.all([
    prisma.availability.findMany({
      where: { dayOfWeek, active: true },
      orderBy: { startMinute: "asc" },
    }),
    prisma.blockedTime.findMany({
      where: { startsAt: { lt: dayEndUtc }, endsAt: { gt: dayStartUtc } },
    }),
    getSetting<number>("booking_buffer_minutes", 10),
  ]);

  if (ranges.length === 0) return [];

  const duration = service.durationMinutes;
  const step = duration + bufferMinutes;
  const now = new Date();

  const slots: TimeSlot[] = [];

  for (const range of ranges) {
    for (let start = range.startMinute; start + duration <= range.endMinute; start += step) {
      const startUtc = businessLocalToUtc(date, start);
      const endUtc = businessLocalToUtc(date, start + duration);

      if (startUtc <= now) continue;

      const blocked = blocks.some((b) => b.startsAt < endUtc && b.endsAt > startUtc);
      if (blocked) continue;

      slots.push({ startUtc: startUtc.toISOString(), endUtc: endUtc.toISOString(), label: formatMinutes(start) });
    }
  }

  return slots;
}
