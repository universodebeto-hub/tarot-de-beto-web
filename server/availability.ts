import { prisma } from "@/lib/prisma";
import { deleteBookingsWithDependents } from "@/server/booking-cleanup";

/**
 * Elimina cualquier reserva PENDING_PAYMENT cuyo plazo ya venció -- nunca
 * llegó a pagarse, así que no queda nada que conservar (no se guardan
 * reservas incompletas). Verificación perezosa (no hay cron todavía): se
 * llama antes de cualquier lectura/creación de reservas.
 *
 * A propósito NO envía notificaciones acá: esta función se invoca desde
 * cualquier lectura (getBookingById, listBookingsAdmin, ...) y Next.js
 * ejecuta esos mismos componentes de servidor durante `next build` para
 * detectar si una ruta es dinámica — si esta función mandara emails,
 * cada build/deploy podría disparar avisos de "tu reserva expiró" a
 * clientes reales. El envío real vive en
 * `server/notifications/expiry.ts` (`expireAndNotify`), que solo se llama
 * desde rutas explícitas (botón del panel admin, endpoint de cron).
 */
export async function expireStaleBookings(): Promise<void> {
  const stale = await prisma.booking.findMany({
    where: { status: "PENDING_PAYMENT", paymentDeadline: { lt: new Date() } },
    select: { id: true },
  });
  await deleteBookingsWithDependents(stale.map((b) => b.id));
}
