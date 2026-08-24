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

export type DayBlockStatus = "available" | "booked" | "blocked" | "buffer" | "past" | "outside-hours";

/** Un bloque fijo de 15 minutos del día — la unidad mínima de la agenda. */
export interface DayBlock {
  /** Minutos desde medianoche (hora del negocio), múltiplo de 15. */
  startMinute: number;
  startUtc: string;
  endUtc: string;
  status: DayBlockStatus;
  /** Solo si status === "booked" — para poder enlazar a /admin/reservas/[id]. */
  bookingId?: string;
}

export interface DayAgenda {
  date: string;
  /** Los 96 bloques de 15 min del día calendario completo (00:00–24:00 local). */
  blocks: DayBlock[];
  /** true si ya se alcanzó el tope de "máximo de consultas por día". */
  dailyCapReached: boolean;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Unidad mínima interna de la agenda. Toda disponibilidad se calcula sobre esta grilla. */
const BLOCK_MINUTES = 15;
const MINUTES_PER_DAY = 24 * 60;

/**
 * Pasa a EXPIRED cualquier reserva PENDING_PAYMENT cuyo plazo ya venció.
 * Verificación perezosa (no hay cron todavía): se llama antes de calcular
 * disponibilidad o crear una reserva, para no bloquear horarios con holds
 * que ya deberían haberse liberado.
 *
 * A propósito NO envía notificaciones acá: esta función se invoca desde
 * cualquier lectura (getAvailableSlots, getBookingById, ...) y Next.js
 * ejecuta esos mismos componentes de servidor durante `next build` para
 * detectar si una ruta es dinámica — si esta función mandara emails,
 * cada build/deploy podría disparar avisos de "tu reserva expiró" a
 * clientes reales. El envío real vive en
 * `server/notifications/expiry.ts` (`expireAndNotify`), que solo se llama
 * desde rutas explícitas (botón del panel admin, endpoint de cron).
 */
export async function expireStaleBookings(): Promise<void> {
  await prisma.booking.updateMany({
    where: { status: "PENDING_PAYMENT", paymentDeadline: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });
}

interface DayContext {
  ranges: { startMinute: number; endMinute: number }[];
  blockedTimes: { startsAt: Date; endsAt: Date }[];
  /** Reservas activas del día, de CUALQUIER servicio — Alberto es un solo
   * proveedor, así que una reserva de cualquier servicio ocupa su horario
   * para todos los demás por igual. */
  activeBookings: { id: string; startsAt: Date; endsAt: Date }[];
  bufferMinutes: number;
  maxBookingsPerDay: number;
}

/** Carga en paralelo todo lo necesario para calcular la agenda de un día. */
async function loadDayContext(date: string): Promise<DayContext> {
  const dayStartUtc = businessLocalToUtc(date, 0);
  const dayEndUtc = businessLocalToUtc(date, MINUTES_PER_DAY);
  const dayOfWeek = businessDayOfWeek(dayStartUtc);

  const [ranges, blockedTimes, activeBookings, bufferMinutes, maxBookingsPerDay] = await Promise.all([
    prisma.availability.findMany({
      where: { dayOfWeek, active: true },
      orderBy: { startMinute: "asc" },
    }),
    prisma.blockedTime.findMany({
      where: { startsAt: { lt: dayEndUtc }, endsAt: { gt: dayStartUtc } },
    }),
    prisma.booking.findMany({
      where: {
        status: { in: ["PENDING_PAYMENT", "CONFIRMED"] },
        startsAt: { lt: dayEndUtc },
        endsAt: { gt: dayStartUtc },
      },
      select: { id: true, startsAt: true, endsAt: true },
    }),
    getSetting<number>("booking_buffer_minutes", 10),
    getSetting<number>("max_bookings_per_day", 4),
  ]);

  return { ranges, blockedTimes, activeBookings, bufferMinutes, maxBookingsPerDay };
}

interface GetAvailableSlotsInput {
  serviceId: string;
  /** Fecha calendario (yyyy-mm-dd) en la zona horaria del negocio. */
  date: string;
}

/**
 * Calcula los horarios disponibles para un servicio en una fecha dada, sobre
 * la grilla fija de bloques de 15 min: horario laboral (Availability) −
 * bloqueos (BlockedTime) − reservas activas de CUALQUIER servicio (Alberto
 * es un solo proveedor) − duración del servicio (redondeada a bloques de 15)
 * − separación configurable entre consultas − tope diario de consultas.
 */
export async function getAvailableSlots({ serviceId, date }: GetAvailableSlotsInput): Promise<TimeSlot[]> {
  if (!DATE_RE.test(date)) return [];

  const service = await getServiceById(serviceId);
  if (!service || !service.available) return [];

  await expireStaleBookings();

  const { ranges, blockedTimes, activeBookings, bufferMinutes, maxBookingsPerDay } = await loadDayContext(date);
  if (ranges.length === 0) return [];

  // Tope diario: si ya se alcanzó, no se ofrece ningún horario ese día sin
  // importar cuánto hueco libre quede en la ventana horaria.
  if (activeBookings.length >= maxBookingsPerDay) return [];

  const now = new Date();
  // El buffer se aplica extendiendo el "fin" de cada reserva/bloqueo ya
  // existente antes de comparar solapamiento, para que el siguiente inicio
  // disponible deje ese respiro configurado después de la consulta anterior.
  const busyRanges = [
    ...blockedTimes.map((b) => ({ startsAt: b.startsAt, endsAt: b.endsAt })),
    ...activeBookings.map((b) => ({
      startsAt: b.startsAt,
      endsAt: new Date(b.endsAt.getTime() + bufferMinutes * 60_000),
    })),
  ];

  const slots: TimeSlot[] = [];

  for (const range of ranges) {
    for (let start = range.startMinute; start + service.durationMinutes <= range.endMinute; start += BLOCK_MINUTES) {
      const startUtc = businessLocalToUtc(date, start);
      const endUtc = businessLocalToUtc(date, start + service.durationMinutes);

      if (startUtc <= now) continue;

      const busy = busyRanges.some((b) => b.startsAt < endUtc && b.endsAt > startUtc);
      if (busy) continue;

      slots.push({ startUtc: startUtc.toISOString(), endUtc: endUtc.toISOString(), label: formatMinutes(start) });
    }
  }

  return slots;
}

/**
 * Calcula el estado de cada uno de los 96 bloques de 15 min de un día,
 * independiente de un servicio — es lo que alimenta la vista visual de
 * columnas por día (agenda pública y panel admin). Para saber si un bloque
 * concreto es un punto de inicio válido para reservar un servicio dado, ver
 * `getAvailableSlots`.
 */
export async function getDayAgenda(date: string): Promise<DayAgenda> {
  if (!DATE_RE.test(date)) return { date, blocks: [], dailyCapReached: false };

  await expireStaleBookings();

  const { ranges, blockedTimes, activeBookings, bufferMinutes, maxBookingsPerDay } = await loadDayContext(date);
  const now = new Date();
  const dailyCapReached = activeBookings.length >= maxBookingsPerDay;

  const blocks: DayBlock[] = [];
  for (let minute = 0; minute < MINUTES_PER_DAY; minute += BLOCK_MINUTES) {
    const startUtc = businessLocalToUtc(date, minute);
    const endUtc = businessLocalToUtc(date, minute + BLOCK_MINUTES);

    const inHours = ranges.some((r) => minute >= r.startMinute && minute + BLOCK_MINUTES <= r.endMinute);
    const blockedHit = blockedTimes.find((b) => b.startsAt < endUtc && b.endsAt > startUtc);
    const bookingHit = activeBookings.find((b) => b.startsAt < endUtc && b.endsAt > startUtc);
    // Zona de respiro configurada después de cada reserva — no es una
    // reserva ni un bloqueo manual, pero tampoco es un punto de inicio
    // válido para una nueva consulta (mismo criterio que getAvailableSlots).
    const bufferHit =
      !bookingHit &&
      activeBookings.find(
        (b) => startUtc < new Date(b.endsAt.getTime() + bufferMinutes * 60_000) && endUtc > b.endsAt,
      );

    let status: DayBlockStatus;
    if (!inHours) {
      status = "outside-hours";
    } else if (blockedHit) {
      status = "blocked";
    } else if (bookingHit) {
      status = "booked";
    } else if (bufferHit) {
      status = "buffer";
    } else if (startUtc <= now) {
      status = "past";
    } else {
      status = "available";
    }

    blocks.push({
      startMinute: minute,
      startUtc: startUtc.toISOString(),
      endUtc: endUtc.toISOString(),
      status,
      bookingId: bookingHit?.id,
    });
  }

  return { date, blocks, dailyCapReached };
}
