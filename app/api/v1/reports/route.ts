import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/api-auth";
import { createReportRequest } from "@/server/bookings";

/** Crea una solicitud de informe (Numerología/Carta Astral) desde la app -- mismo server/bookings.ts::createReportRequest que usa la web, sin duplicar lógica. */
export async function POST(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  const body = await request.json().catch(() => null);

  const result = await createReportRequest(
    {
      serviceId: String(body?.serviceId ?? ""),
      guestName: body?.guestName || undefined,
      guestEmail: body?.guestEmail || undefined,
      guestPhone: body?.guestPhone || undefined,
      intakeData: body?.intakeData || undefined,
    },
    user,
  );

  if (result.error || !result.booking) {
    return NextResponse.json({ error: result.error ?? "No se pudo crear la solicitud." }, { status: 400 });
  }
  return NextResponse.json({ booking: result.booking });
}
