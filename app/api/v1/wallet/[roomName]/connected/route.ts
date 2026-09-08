import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/api-auth";
import { markWalletCallConnected } from "@/server/wallet";

export async function POST(request: Request, { params }: { params: Promise<{ roomName: string }> }) {
  const { roomName } = await params;
  const user = await getCurrentUserFromRequest(request);
  const result = await markWalletCallConnected(roomName, user);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }
  return NextResponse.json({ success: true });
}
