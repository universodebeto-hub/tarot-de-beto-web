import { NextResponse } from "next/server";
import { getWalletCallAccess } from "@/server/wallet";

export async function GET(_req: Request, { params }: { params: Promise<{ tarotistaId: string }> }) {
  const { tarotistaId } = await params;
  const result = await getWalletCallAccess(tarotistaId);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }
  return NextResponse.json(result);
}
