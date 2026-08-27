import { NextResponse } from "next/server";
import { requireAdminFromRequest, UnauthorizedError } from "@/lib/auth/api-auth";
import { getDashboardStats } from "@/server/admin/dashboard";

export async function GET(request: Request) {
  try {
    await requireAdminFromRequest(request);
    const stats = await getDashboardStats();
    return NextResponse.json({ stats });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
