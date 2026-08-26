import { NextResponse } from "next/server";
import { requireAuthFromRequest, UnauthorizedError } from "@/lib/auth/api-auth";
import { getUserBookings } from "@/server/bookings";

/** Reservas/consultas de la cuenta logueada — para la pantalla "Mis reservas" de la app. */
export async function GET(request: Request) {
  try {
    const user = await requireAuthFromRequest(request);
    const bookings = await getUserBookings(user.id);
    return NextResponse.json({ bookings });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
