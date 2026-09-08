import "server-only";
import { prisma } from "@/lib/prisma";

/** Número correlativo de reserva (BETO-<año>-00001), atómico por año -- compartido por todo lo que crea una Booking (server/bookings.ts, server/consultations.ts, regalos de consulta desde el panel admin). */
export async function nextBookingNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const key = `booking_number_${year}`;
  // Un solo upsert atómico (INSERT ... ON CONFLICT DO UPDATE) — separarlo en
  // upsert+update deja una ventana de carrera real: dos solicitudes
  // concurrentes que crean el contador del año por primera vez al mismo
  // tiempo pueden violar la restricción única de `key` entre el upsert y el
  // update.
  const counter = await prisma.counter.upsert({
    where: { key },
    update: { value: { increment: 1 } },
    create: { key, value: 1 },
  });
  return `BETO-${year}-${String(counter.value).padStart(5, "0")}`;
}

const PENDING_PREFIX = "PENDIENTE-";

/**
 * Marcador temporal para una reserva recién creada, todavía sin pagar --
 * no consume ningún valor de la numeración BETO-<año>-NNNNN, para que esa
 * serie solo cuente reservas que de verdad llegaron a pagarse (ver
 * assignBookingNumberIfMissing). Único por timestamp+azar, no por id, así
 * que no depende de conocer el id antes de crear la fila.
 */
export function pendingBookingNumber(): string {
  return `${PENDING_PREFIX}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function isPendingBookingNumber(bookingNumber: string): boolean {
  return bookingNumber.startsWith(PENDING_PREFIX);
}

/**
 * Reemplaza el marcador temporal por el número correlativo real la primera
 * vez que una reserva llega a pago confirmado -- se llama desde
 * server/admin/bookings.ts::setBookingStatus (manual/PayPal vía admin,
 * crédito) y server/paypal-orders.ts::captureOrderForBooking (PayPal
 * directo). Si ya tenía un número real (ej. se llama dos veces por
 * error), no hace nada -- nunca reasigna.
 */
export async function assignBookingNumberIfMissing(bookingId: string, currentNumber: string): Promise<string> {
  if (!isPendingBookingNumber(currentNumber)) return currentNumber;
  const real = await nextBookingNumber();
  await prisma.booking.update({ where: { id: bookingId }, data: { bookingNumber: real } });
  return real;
}
