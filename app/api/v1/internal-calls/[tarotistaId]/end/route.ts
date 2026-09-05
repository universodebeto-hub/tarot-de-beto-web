import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/api-auth";
import { endInternalCall } from "@/server/internal-calls";

export async function POST(request: Request, { params }: { params: Promise<{ tarotistaId: string }> }) {
  const { tarotistaId } = await params;
  const user = await getCurrentUserFromRequest(request);
  const result = await endInternalCall(tarotistaId, user);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }
  return NextResponse.json({ success: true });
}
