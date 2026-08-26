import { NextRequest, NextResponse } from "next/server";
import { subscribeOwnPush } from "@/server/tarotista-panel";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const endpoint = String(body?.endpoint ?? "");
  const p256dh = String(body?.p256dh ?? "");
  const auth = String(body?.auth ?? "");

  const result = await subscribeOwnPush(endpoint, p256dh, auth);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
