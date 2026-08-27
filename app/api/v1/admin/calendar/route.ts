import { NextResponse } from "next/server";
import { requireAdminFromRequest, UnauthorizedError } from "@/lib/auth/api-auth";
import { getDayAgenda } from "@/server/availability";
import { toggleQuickBlock } from "@/server/admin/schedule";

export async function GET(request: Request) {
  try {
    await requireAdminFromRequest(request);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    if (!date) return NextResponse.json({ error: "Falta la fecha." }, { status: 400 });
    const agenda = await getDayAgenda(date);
    return NextResponse.json({ agenda });
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
    const date = String(body?.date ?? "");
    const startMinute = Number(body?.startMinute);
    if (!date || Number.isNaN(startMinute)) {
      return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    }
    await toggleQuickBlock(date, startMinute, user);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
