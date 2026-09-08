import { NextResponse } from "next/server";
import { markWalletCallConnected } from "@/server/wallet";

export async function POST(_req: Request, { params }: { params: Promise<{ roomName: string }> }) {
  const { roomName } = await params;
  const result = await markWalletCallConnected(roomName);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }
  return NextResponse.json({ success: true });
}
