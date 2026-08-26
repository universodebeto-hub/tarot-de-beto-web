import { NextResponse } from "next/server";
import { createAttentionRequest } from "@/server/attention-requests";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await createAttentionRequest({
    tarotistaId: String(body?.tarotistaId ?? ""),
    name: String(body?.name ?? ""),
    email: body?.email || "",
    phone: body?.phone || undefined,
    serviceId: body?.serviceId || undefined,
    preferredTime: body?.preferredTime || undefined,
    message: body?.message || undefined,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
