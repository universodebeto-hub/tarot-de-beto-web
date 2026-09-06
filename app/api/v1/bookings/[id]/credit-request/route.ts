import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/api-auth";
import { requestCreditBooking } from "@/server/credit";

/** Equivalente móvil de la Server Action requestCreditBookingAction (web) -- ver app/reservas/[id]/credit-actions.ts. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUserFromRequest(request);
  const result = await requestCreditBooking(id, user);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
