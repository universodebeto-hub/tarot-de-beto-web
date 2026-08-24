import { NextResponse } from "next/server";
import { getBookingById } from "@/server/bookings";
import { siteConfig } from "@/config/site";
import { isReportOnlyService } from "@/lib/service-fulfillment";

function toIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await getBookingById(id);

  if (!booking || booking.status === "CANCELLED" || booking.status === "EXPIRED") {
    return NextResponse.json({ error: "Reserva no encontrada." }, { status: 404 });
  }

  if (isReportOnlyService(booking.service.slug)) {
    return NextResponse.json({ error: "Este servicio no tiene un horario de calendario." }, { status: 400 });
  }

  const now = toIcsDate(new Date());
  const summary = escapeIcsText(`${booking.service.name} — ${siteConfig.siteName}`);
  const description = escapeIcsText(
    `Reserva #${booking.bookingNumber}. Duración: ${booking.service.durationMinutes} minutos.`,
  );

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${siteConfig.siteName}//Reservas//ES`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${booking.id}@${new URL(siteConfig.siteUrl).hostname}`,
    `DTSTAMP:${now}`,
    `DTSTART:${toIcsDate(booking.startsAt)}`,
    `DTEND:${toIcsDate(booking.endsAt)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${booking.bookingNumber}.ics"`,
    },
  });
}
