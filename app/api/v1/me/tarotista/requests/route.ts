import { NextResponse } from "next/server";
import { requireAuthFromRequest, UnauthorizedError } from "@/lib/auth/api-auth";
import { getOwnAttentionRequests } from "@/server/tarotista-panel";

export async function GET(request: Request) {
  try {
    const user = await requireAuthFromRequest(request);
    const requests = await getOwnAttentionRequests(user);
    return NextResponse.json({ requests });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
