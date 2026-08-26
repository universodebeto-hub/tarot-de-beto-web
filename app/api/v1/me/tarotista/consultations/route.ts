import { NextResponse } from "next/server";
import { requireAuthFromRequest, UnauthorizedError } from "@/lib/auth/api-auth";
import { getOwnConfirmedConsultations } from "@/server/tarotista-panel";

export async function GET(request: Request) {
  try {
    const user = await requireAuthFromRequest(request);
    const consultations = await getOwnConfirmedConsultations(user);
    return NextResponse.json({ consultations });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
