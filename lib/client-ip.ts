import "server-only";
import { headers } from "next/headers";

/**
 * IP del cliente para usar como clave de rate limiting, a partir de un
 * objeto Headers ya disponible (ej. `request.headers` en un Route Handler).
 * Lee `x-forwarded-for` (lo que pone Vercel/cualquier proxy delante de la
 * app) y cae a un valor fijo en desarrollo local, donde ese header no existe.
 */
export function clientIpFromHeaders(h: Headers): string {
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "local";
}

/** Igual que `clientIpFromHeaders`, pero para usar desde un Server Action
 * (sin un `Request` a mano — lee los headers de la petición actual vía
 * `next/headers`). */
export async function clientIp(): Promise<string> {
  return clientIpFromHeaders(await headers());
}
