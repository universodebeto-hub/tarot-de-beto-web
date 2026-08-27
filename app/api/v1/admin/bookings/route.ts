import { NextResponse } from "next/server";
import { requireAdminFromRequest, UnauthorizedError } from "@/lib/auth/api-auth";
import { listBookingsAdmin } from "@/server/admin/bookings";
import type { BookingStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    await requireAdminFromRequest(request);
    const { searchParams } = new URL(request.url);
    const bookings = await listBookingsAdmin({
      status: (searchParams.get("status") as BookingStatus | null) ?? undefined,
      serviceId: searchParams.get("serviceId") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      q: searchParams.get("q") ?? undefined,
    });
    return NextResponse.json({ bookings });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
