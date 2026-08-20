import "server-only";
import { prisma } from "@/lib/prisma";
import { notifyExpired } from "@/server/notifications/send";

/**
 * Versión "con aviso" de la expiración perezosa: pasa a EXPIRED las
 * reservas vencidas Y manda el correo correspondiente. A diferencia de
 * `expireStaleBookings` (en `server/availability.ts`), esta función solo
 * debe llamarse desde código disparado por una acción real — un botón del
 * panel admin o el endpoint de cron — nunca desde el cuerpo de una página,
 * para que `next build` no pueda ejecutarla como efecto secundario de
 * analizar las rutas.
 */
export async function expireAndNotify(): Promise<{ expired: number }> {
  const stale = await prisma.booking.findMany({
    where: { status: "PENDING_PAYMENT", paymentDeadline: { lt: new Date() } },
    include: { service: true, user: true },
  });
  if (stale.length === 0) return { expired: 0 };

  await prisma.booking.updateMany({
    where: { id: { in: stale.map((b) => b.id) } },
    data: { status: "EXPIRED" },
  });

  for (const booking of stale) {
    await notifyExpired(booking).catch((err) => console.error("[notify] expired:", err));
  }

  return { expired: stale.length };
}
