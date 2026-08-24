import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "@/lib/auth/jwt";
import type { SessionPayload } from "@/lib/auth/jwt";

export async function createSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Payload crudo de la sesión (solo userId/role), sin ir a la base de datos. */
export async function getSessionPayload(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export interface CurrentUser {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  role: "ADMIN" | "CLIENT";
}

/** Carga el usuario a partir de un payload de sesión ya verificado — usado
 * tanto por la cookie web (getCurrentUser) como por el Bearer token de la
 * futura API móvil (lib/auth/api-auth.ts), sin duplicar la consulta. */
export async function loadCurrentUser(payload: SessionPayload | null): Promise<CurrentUser | null> {
  if (!payload) return null;

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) return null;

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
}

/** Usuario actual (con datos de perfil) o null si no hay sesión válida. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const payload = await getSessionPayload();
  return loadCurrentUser(payload);
}

/**
 * Exige un usuario ADMIN autenticado. Usar al inicio de cada Server Action
 * administrativa — la protección de `proxy.ts` cubre la navegación normal,
 * pero una Server Action es un endpoint de red por su cuenta y necesita su
 * propia verificación (defensa en profundidad).
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    throw new Error("No autorizado.");
  }
  return user;
}
