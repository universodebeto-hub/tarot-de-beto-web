import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "@/lib/auth/jwt";

describe("signSession/verifySession", () => {
  it("verifica correctamente un token propio", async () => {
    const token = await signSession({ userId: "abc123", role: "CLIENT" });
    const payload = await verifySession(token);
    expect(payload).toEqual({ userId: "abc123", role: "CLIENT" });
  });

  it("rechaza un token con firma inválida", async () => {
    const token = await signSession({ userId: "abc123", role: "ADMIN" });
    const tampered = token.slice(0, -2) + "xx";
    expect(await verifySession(tampered)).toBeNull();
  });

  it("rechaza basura que no es un JWT", async () => {
    expect(await verifySession("no-soy-un-token")).toBeNull();
  });
});
