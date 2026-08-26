import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/api-auth";
import { getCallAccess } from "@/server/calls";

export async function GET(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const user = await getCurrentUserFromRequest(request);
  const result = await getCallAccess(bookingId, user);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }
  return NextResponse.json(result);
}
