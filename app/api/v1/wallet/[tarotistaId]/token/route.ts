import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/api-auth";
import { getWalletCallAccess } from "@/server/wallet";

export async function GET(request: Request, { params }: { params: Promise<{ tarotistaId: string }> }) {
  const { tarotistaId } = await params;
  const user = await getCurrentUserFromRequest(request);
  const result = await getWalletCallAccess(tarotistaId, user);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }
  return NextResponse.json(result);
}
