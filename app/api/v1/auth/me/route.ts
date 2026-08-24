import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/api-auth";

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  return NextResponse.json({ user });
}
