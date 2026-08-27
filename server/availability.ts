import { prisma } from "@/lib/prisma";

/**
 * Pasa a EXPIRED cualquier reserva PENDING_PAYMENT cuyo plazo ya venció.
 * Verificación perezosa (no hay cron todavía): se llama antes de cualquier
 * lectura/creación de reservas.
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
  await prisma.booking.updateMany({
    where: { status: "PENDING_PAYMENT", paymentDeadline: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });
}
