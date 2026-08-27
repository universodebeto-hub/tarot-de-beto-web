import { NextResponse } from "next/server";
import { requireAdminFromRequest, UnauthorizedError } from "@/lib/auth/api-auth";
import { upsertSettingAdmin } from "@/server/admin/settings";

export async function PATCH(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const user = await requireAdminFromRequest(request);
    const { key } = await params;
    const body = await request.json().catch(() => ({}));

    const form = new FormData();
    form.set("value", typeof body?.value === "string" ? body.value : JSON.stringify(body?.value ?? ""));

    const result = await upsertSettingAdmin(key, {}, form, user);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
