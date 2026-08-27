import "server-only";
import { verifySession } from "@/lib/auth/jwt";
import { loadCurrentUser, type CurrentUser } from "@/lib/auth/session";

/**
 * Autenticación para la API JSON (`app/api/v1/...`), pensada para la futura
 * app móvil: en vez de la cookie httpOnly que usa la web, el cliente manda
 * `Authorization: Bearer <jwt>`. Mismo token (`lib/auth/jwt.ts`) y mismos
 * usuarios que la sesión web — no es un sistema de cuentas aparte.
 */

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function getCurrentUserFromRequest(request: Request): Promise<CurrentUser | null> {
  const token = extractBearerToken(request);
  if (!token) return null;
  const payload = await verifySession(token);
  return loadCurrentUser(payload);
}

export class UnauthorizedError extends Error {
  constructor(message = "No autorizado.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function requireAuthFromRequest(request: Request): Promise<CurrentUser> {
  const user = await getCurrentUserFromRequest(request);
  if (!user) throw new UnauthorizedError();
  return user;
}

/** Mismo criterio que `requireAdmin()` (web, cookie) pero para el Bearer token de la app -- panel de administrador móvil. */
export async function requireAdminFromRequest(request: Request): Promise<CurrentUser> {
  const user = await requireAuthFromRequest(request);
  if (user.role !== "ADMIN") throw new UnauthorizedError("No tienes permisos de administrador.");
  return user;
}
