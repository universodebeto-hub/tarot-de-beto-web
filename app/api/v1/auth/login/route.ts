import { NextResponse } from "next/server";
import { signSession } from "@/lib/auth/jwt";
import { loginAccount } from "@/server/user-auth";
import { clientIpFromHeaders } from "@/lib/client-ip";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await loginAccount(body, clientIpFromHeaders(request.headers));

  if (result.error || !result.user) {
    return NextResponse.json({ error: result.error ?? "No se pudo iniciar sesión." }, { status: 401 });
  }

  const token = await signSession({ userId: result.user.id, role: result.user.role });
  return NextResponse.json({ token });
}
