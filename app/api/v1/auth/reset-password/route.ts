import { NextResponse } from "next/server";
import { resetPasswordCore } from "@/server/user-auth";
import { clientIpFromHeaders } from "@/lib/client-ip";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await resetPasswordCore(body, clientIpFromHeaders(request.headers));

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
