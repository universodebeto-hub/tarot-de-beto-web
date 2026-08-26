import { NextResponse } from "next/server";
import { requireAuthFromRequest, UnauthorizedError } from "@/lib/auth/api-auth";
import { subscribeOwnPush } from "@/server/tarotista-panel";

export async function POST(request: Request) {
  try {
    const user = await requireAuthFromRequest(request);
    const body = await request.json().catch(() => null);
    const result = await subscribeOwnPush(
      String(body?.endpoint ?? ""),
      String(body?.p256dh ?? ""),
      String(body?.auth ?? ""),
      user,
    );
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
