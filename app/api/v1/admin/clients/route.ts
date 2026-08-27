import { NextResponse } from "next/server";
import { requireAdminFromRequest, UnauthorizedError } from "@/lib/auth/api-auth";
import { listClientsAdmin } from "@/server/admin/clients";

export async function GET(request: Request) {
  try {
    await requireAdminFromRequest(request);
    const { searchParams } = new URL(request.url);
    const clients = await listClientsAdmin(searchParams.get("q") ?? undefined);
    return NextResponse.json({ clients });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
