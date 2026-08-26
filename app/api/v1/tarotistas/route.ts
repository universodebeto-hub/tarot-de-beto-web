import { NextResponse } from "next/server";
import { getActiveTarotistas } from "@/server/tarotistas";

export async function GET() {
  const tarotistas = await getActiveTarotistas();
  return NextResponse.json({ tarotistas });
}
