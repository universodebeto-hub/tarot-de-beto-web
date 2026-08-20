import { NextResponse } from "next/server";
import { expireAndNotify } from "@/server/notifications/expiry";
import { sendDueReminders } from "@/server/notifications/reminders";

/**
 * Tareas de mantenimiento periódicas: expira reservas vencidas (avisando
 * por email) y manda los recordatorios de consulta próxima (24h/2h antes,
 * configurable). Pensado para dispararse desde un cron externo (ej. Vercel
 * Cron cada 15-30 min) contra esta URL con el header
 * `Authorization: Bearer <CRON_SECRET>`. Sin CRON_SECRET configurado, el
 * endpoint rechaza toda solicitud — no hay forma de disparar envíos de
 * email sin la credencial. En desarrollo, el panel admin también tiene un
 * botón manual para lo mismo (`/admin`).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET no configurado." }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const [expiry, reminders] = await Promise.all([expireAndNotify(), sendDueReminders()]);
  return NextResponse.json({ expired: expiry.expired, remindersSent: reminders.sent });
}
