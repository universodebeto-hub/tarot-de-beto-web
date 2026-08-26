import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/api-auth";
import { createInstantConsultation } from "@/server/consultations";

/** Crea una consulta instantánea con un tarotista DISPONIBLE — mismo flujo que la web (server/consultations.ts), sin duplicar lógica. */
export async function POST(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  const body = await request.json().catch(() => null);

  const result = await createInstantConsultation(
    {
      tarotistaId: String(body?.tarotistaId ?? ""),
      serviceId: String(body?.serviceId ?? ""),
      guestName: body?.guestName || undefined,
      guestEmail: body?.guestEmail || undefined,
      guestPhone: body?.guestPhone || undefined,
      intakeData: body?.intakeData || undefined,
    },
    user,
  );

  if (result.error || !result.booking) {
    return NextResponse.json({ error: result.error ?? "No se pudo crear la consulta." }, { status: 400 });
  }
  return NextResponse.json({ booking: result.booking });
}
