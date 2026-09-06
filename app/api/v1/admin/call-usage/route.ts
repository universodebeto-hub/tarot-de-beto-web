import { NextResponse } from "next/server";
import { requireAdminFromRequest, UnauthorizedError } from "@/lib/auth/api-auth";
import { getCallUsageReport } from "@/server/admin/call-usage";

/** Equivalente móvil de /admin/consumo (web) -- ver server/admin/call-usage.ts. */
export async function GET(request: Request) {
  try {
    await requireAdminFromRequest(request);
    const groups = await getCallUsageReport();
    return NextResponse.json({ groups });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
