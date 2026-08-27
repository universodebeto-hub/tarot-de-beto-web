import { NextResponse } from "next/server";
import { requireAdminFromRequest, UnauthorizedError } from "@/lib/auth/api-auth";
import { listSettingsAdmin } from "@/server/admin/settings";

export async function GET(request: Request) {
  try {
    await requireAdminFromRequest(request);
    const settings = await listSettingsAdmin();
    return NextResponse.json({ settings });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
