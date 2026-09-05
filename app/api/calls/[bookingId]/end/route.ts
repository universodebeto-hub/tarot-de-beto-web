import { NextResponse } from "next/server";
import { endCall } from "@/server/calls";

export async function POST(_req: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const result = await endCall(bookingId);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }
  return NextResponse.json({ success: true });
}
