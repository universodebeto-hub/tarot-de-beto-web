import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Borra un lote de reservas junto con todo lo que dependa de ellas
 * (mensajes, registros de llamada, transacciones PayPal). Necesario porque
 * `prisma.booking.deleteMany` por sí solo revienta con una violación de
 * llave foránea apenas UNA de esas reservas tiene una PaypalTransaction
 * asociada (ej. alguien apretó "pagar con tarjeta", se creó la orden en
 * PayPal, y nunca completó el pago) -- eso rompía cualquier página que
 * llamara a expireStaleBookings/expireAndNotify/cleanupIncompleteBookings.
 */
export async function deleteBookingsWithDependents(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const [, , , result] = await prisma.$transaction([
    prisma.message.deleteMany({ where: { bookingId: { in: ids } } }),
    prisma.callLog.deleteMany({ where: { bookingId: { in: ids } } }),
    prisma.paypalTransaction.deleteMany({ where: { bookingId: { in: ids } } }),
    prisma.booking.deleteMany({ where: { id: { in: ids } } }),
  ]);
  return result.count;
}
