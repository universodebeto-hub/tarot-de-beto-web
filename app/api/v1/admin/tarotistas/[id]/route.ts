import { NextResponse } from "next/server";
import { requireAdminFromRequest, UnauthorizedError } from "@/lib/auth/api-auth";
import { updateTarotistaProfile, toggleTarotistaActive, linkTarotistaAccount, unlinkTarotistaAccount } from "@/server/admin/tarotistas";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdminFromRequest(request);
    const { id } = await params;
    const body = await request.json().catch(() => null);

    if (body?.bio !== undefined || body?.experience !== undefined) {
      const result = await updateTarotistaProfile(id, { bio: body.bio, experience: body.experience }, user);
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    }
    if (body?.toggleActive) {
      const result = await toggleTarotistaActive(id, user);
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    }
    if (typeof body?.linkEmail === "string") {
      const result = await linkTarotistaAccount(id, body.linkEmail, user);
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    }
    if (body?.unlink) {
      const result = await unlinkTarotistaAccount(id, user);
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
