import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "td_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 días

export interface SessionPayload {
  userId: string;
  role: "ADMIN" | "CLIENT";
}

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET no está configurado");
  return new TextEncoder().encode(secret);
}

/** Firma un JWT de sesión. Edge-compatible (usable en middleware). */
export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

/** Verifica un JWT de sesión; retorna null si es inválido/expirado. Edge-compatible. */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.userId !== "string" || (payload.role !== "ADMIN" && payload.role !== "CLIENT")) {
      return null;
    }
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = SESSION_DURATION_SECONDS;
