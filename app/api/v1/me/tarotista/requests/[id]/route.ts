import { NextResponse } from "next/server";
import { requireAuthFromRequest, UnauthorizedError } from "@/lib/auth/api-auth";
import { setOwnAttentionRequestStatus } from "@/server/tarotista-panel";
import type { AttentionRequestStatus } from "@prisma/client";

const VALID_STATUSES: AttentionRequestStatus[] = ["PENDING", "CONTACTED", "DISMISSED"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireAuthFromRequest(request);
    const body = await request.json().catch(() => null);
    const status = body?.status as AttentionRequestStatus;
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
    }
    const result = await setOwnAttentionRequestStatus(id, status, user);
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
