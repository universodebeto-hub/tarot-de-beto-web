import { NextResponse } from "next/server";
import { getBookingById } from "@/server/bookings";

/** Mismo criterio que la página web /reservas/[id]: el id (cuid) es la credencial, sin login obligatorio para verla. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await getBookingById(id);
  if (!booking) return NextResponse.json({ error: "Reserva no encontrada." }, { status: 404 });
  return NextResponse.json({ booking });
}
