import { NextResponse } from "next/server";
import { requireAdminFromRequest, UnauthorizedError } from "@/lib/auth/api-auth";
import { listTarotistasAdmin } from "@/server/admin/tarotistas";

export async function GET(request: Request) {
  try {
    await requireAdminFromRequest(request);
    const tarotistas = await listTarotistasAdmin();
    return NextResponse.json({ tarotistas });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
