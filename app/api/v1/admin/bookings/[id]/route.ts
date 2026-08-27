import { NextResponse } from "next/server";
import { requireAdminFromRequest, UnauthorizedError } from "@/lib/auth/api-auth";
import { getBookingAdminById, setBookingStatus, addBookingNote } from "@/server/admin/bookings";
import type { BookingStatus } from "@prisma/client";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminFromRequest(request);
    const { id } = await params;
    const booking = await getBookingAdminById(id);
    if (!booking) {
      return NextResponse.json({ error: "Reserva no encontrada." }, { status: 404 });
    }
    return NextResponse.json({ booking });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdminFromRequest(request);
    const { id } = await params;
    const body = await request.json().catch(() => null);

    if (body?.status) {
      const result = await setBookingStatus(id, body.status as BookingStatus, user);
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    }
    if (typeof body?.note === "string" && body.note.trim()) {
      const result = await addBookingNote(id, body.note, user);
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
