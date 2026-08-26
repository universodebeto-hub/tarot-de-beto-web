import { NextResponse } from "next/server";
import { getCallAccess } from "@/server/calls";

export async function GET(_req: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const result = await getCallAccess(bookingId);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }
  return NextResponse.json(result);
}
