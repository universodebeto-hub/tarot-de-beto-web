import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/jwt";

/**
 * CORS para las rutas que la app móvil (Expo/React Native) consume por
 * Bearer token, sin cookie de sesión — un origen nativo no manda "Origin"
 * y no lo necesita, pero el modo web de Expo (usado para probar rápido
 * sin un teléfono) sí corre en un origen distinto y el navegador bloquea
 * la respuesta sin estos headers. Abierto a cualquier origen a propósito:
 * estas rutas nunca leen cookies ni dependen de estado ambiente del
 * navegador, así que no hay riesgo de CSRF por abrirlas.
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
    }
    const response = NextResponse.next();
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      response.headers.set(key, value);
    }
    return response;
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (request.nextUrl.pathname.startsWith("/admin") && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/panel-tarotista/:path*", "/api/:path*"],
};
