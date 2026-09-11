import { NextRequest, NextResponse } from "next/server";
import { completeTikTokAuthorization } from "@/server/tiktok";

/** A donde TikTok redirige después de que Beto autoriza desde /admin/configuracion (ver server/tiktok.ts::getTikTokAuthorizeUrl). */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  const redirectBase = new URL("/admin/configuracion", req.nextUrl.origin);

  if (error || !code || !state) {
    redirectBase.searchParams.set("tiktok_error", error ?? "No se pudo completar la conexión.");
    return NextResponse.redirect(redirectBase);
  }

  const result = await completeTikTokAuthorization(code, state);
  if (result.error) {
    redirectBase.searchParams.set("tiktok_error", result.error);
  } else {
    redirectBase.searchParams.set("tiktok_connected", "1");
  }
  return NextResponse.redirect(redirectBase);
}
