import "server-only";
import { headers } from "next/headers";

/**
 * IP del cliente para usar como clave de rate limiting. Lee `x-forwarded-for`
 * (lo que pone Vercel/cualquier proxy delante de la app) y cae a un valor
 * fijo en desarrollo local, donde ese header no existe.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "local";
}
