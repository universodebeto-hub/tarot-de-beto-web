import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/api-auth";
import { getCreditStatus } from "@/server/credit";

/** Equivalente móvil de la sección "Pagos pendientes" de /dashboard (web) -- saldo de Créditos Beto de la cuenta logueada. */
export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!user.canUseCredit) return NextResponse.json({ status: null });
  const status = await getCreditStatus(user.id);
  return NextResponse.json({ status });
}
