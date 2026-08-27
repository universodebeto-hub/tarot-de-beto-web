import { NextResponse } from "next/server";
import { requireAdminFromRequest, UnauthorizedError } from "@/lib/auth/api-auth";
import { createServiceAdmin } from "@/server/admin/services";

function toFormData(body: Record<string, unknown>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null) continue;
    form.set(key, typeof value === "boolean" ? (value ? "on" : "") : String(value));
  }
  return form;
}

export async function POST(request: Request) {
  try {
    const user = await requireAdminFromRequest(request);
    const body = await request.json().catch(() => ({}));
    const result = await createServiceAdmin({}, toFormData(body), user);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
