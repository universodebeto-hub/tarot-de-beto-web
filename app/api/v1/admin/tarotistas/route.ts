import { NextResponse } from "next/server";
import { requireAdminFromRequest, UnauthorizedError } from "@/lib/auth/api-auth";
import { listTarotistasAdmin, createTarotista } from "@/server/admin/tarotistas";

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

export async function POST(request: Request) {
  try {
    const user = await requireAdminFromRequest(request);
    const body = await request.json().catch(() => null);
    const result = await createTarotista(
      {
        name: body?.name,
        bio: body?.bio,
        experience: body?.experience,
        specialties: body?.specialties,
      },
      user,
    );
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ tarotista: result.tarotista });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
