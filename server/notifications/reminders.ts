import "server-only";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/server/settings";
import { notifyReminder } from "@/server/notifications/send";

const DEFAULT_REMINDER_HOURS = [24, 2];

/**
 * Envía los recordatorios que ya "vencieron" (ej. estamos a menos de 24h o
 * de 2h de la consulta) y todavía no se enviaron para esa reserva. Sin cron
 * real en este entorno — se dispara desde `/api/cron/reminders` (pensado
 * para un cron externo tipo Vercel Cron) y, de forma oportunista, cuando
 * alguien abre el panel admin, para que igual funcione sin cron configurado.
 * No envía recordatorio de una reserva cancelada/expirada (el filtro
 * `status: "CONFIRMED"` ya las excluye).
 */
export async function sendDueReminders(): Promise<{ sent: number }> {
  const hoursList = await getSetting<number[]>("reminder_hours_before", DEFAULT_REMINDER_HOURS);
  if (hoursList.length === 0) return { sent: 0 };

  const now = new Date();
  const maxHours = Math.max(...hoursList);
  const horizon = new Date(now.getTime() + maxHours * 60 * 60_000);

  const candidates = await prisma.booking.findMany({
    where: { status: "CONFIRMED", startsAt: { gt: now, lte: horizon } },
    include: { service: true, user: true },
  });

  let sent = 0;
  for (const booking of candidates) {
    for (const hours of hoursList) {
      if (booking.remindersSentHours.includes(hours)) continue;
      const dueAt = new Date(booking.startsAt.getTime() - hours * 60 * 60_000);
      if (now < dueAt) continue;

      await notifyReminder(booking, hours).catch((err) => console.error("[notify] reminder:", err));
      await prisma.booking.update({
        where: { id: booking.id },
        data: { remindersSentHours: { push: hours } },
      });
      sent += 1;
    }
  }

  return { sent };
}
