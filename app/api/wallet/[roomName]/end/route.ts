import { NextResponse } from "next/server";
import { endWalletCall } from "@/server/wallet";

export async function POST(_req: Request, { params }: { params: Promise<{ roomName: string }> }) {
  const { roomName } = await params;
  const result = await endWalletCall(roomName);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }
  return NextResponse.json({ success: true });
}
