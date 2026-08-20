import { describe, it, expect, beforeEach, vi } from "vitest";

// `getCurrentUser`/`requireAdmin` (lib/auth/session.ts) llaman a `cookies()`
// de `next/headers`, que fuera de una request real de Next.js lanza un
// error ("outside a request scope"). Se mockea con un store en memoria
// controlable por test para poder probar la lógica de autorización sin
// levantar un servidor Next completo.
const { cookieStore } = vi.hoisted(() => ({
  cookieStore: new Map<string, string>(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieStore.has(name) ? { value: cookieStore.get(name)! } : undefined),
    set: (name: string, value: string) => cookieStore.set(name, value),
    delete: (name: string) => cookieStore.delete(name),
  }),
}));

import { signSession } from "@/lib/auth/jwt";
import { requireAdmin, getCurrentUser, createSessionCookie } from "@/lib/auth/session";
import { resetDb, createTestUser } from "../helpers/db";

describe("requireAdmin / getCurrentUser", () => {
  beforeEach(async () => {
    cookieStore.clear();
    await resetDb();
  });

  it("getCurrentUser retorna null sin cookie de sesión", async () => {
    expect(await getCurrentUser()).toBeNull();
  });

  it("getCurrentUser retorna null con un token con firma inválida", async () => {
    cookieStore.set("td_session", "token-invalido");
    expect(await getCurrentUser()).toBeNull();
  });

  it("requireAdmin lanza si no hay sesión", async () => {
    await expect(requireAdmin()).rejects.toThrow("No autorizado.");
  });

  it("requireAdmin lanza si el usuario es CLIENT, no ADMIN", async () => {
    const client = await createTestUser({ role: "CLIENT" });
    const token = await signSession({ userId: client.id, role: "CLIENT" });
    cookieStore.set("td_session", token);
    await expect(requireAdmin()).rejects.toThrow("No autorizado.");
  });

  it("requireAdmin resuelve con el usuario si es ADMIN", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    const token = await signSession({ userId: admin.id, role: "ADMIN" });
    cookieStore.set("td_session", token);
    const resolved = await requireAdmin();
    expect(resolved.id).toBe(admin.id);
    expect(resolved.role).toBe("ADMIN");
  });

  it("requireAdmin lanza si el usuario del token fue eliminado de la base de datos", async () => {
    const token = await signSession({ userId: "usuario-que-no-existe", role: "ADMIN" });
    cookieStore.set("td_session", token);
    await expect(requireAdmin()).rejects.toThrow("No autorizado.");
  });

  it("createSessionCookie deja una cookie que getCurrentUser puede leer de vuelta", async () => {
    const user = await createTestUser({ role: "CLIENT" });
    await createSessionCookie({ userId: user.id, role: "CLIENT" });
    const current = await getCurrentUser();
    expect(current?.id).toBe(user.id);
  });
});
