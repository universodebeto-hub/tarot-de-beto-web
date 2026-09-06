import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/api-auth";
import { getOwnCallUsageReport } from "@/server/tarotista-panel";

/** Equivalente móvil de /panel-tarotista/consumo (web) -- siempre el propio tarotista de la cuenta logueada, nunca uno pasado por parámetro. */
export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  const groups = await getOwnCallUsageReport(user);
  return NextResponse.json({ groups });
}
