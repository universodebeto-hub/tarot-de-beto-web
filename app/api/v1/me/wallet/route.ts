import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

/** Saldo de la bolsa de minutos del cliente logueado -- equivalente móvil de lo que ya se ve en /dashboard (web). */
export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { minutesBalance: true } });
  return NextResponse.json({ minutesBalance: row?.minutesBalance ?? 0 });
}
