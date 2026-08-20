import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("hashPassword/verifyPassword", () => {
  it("verifica correctamente la contraseña correcta", async () => {
    const hash = await hashPassword("Tarot2026!");
    expect(await verifyPassword("Tarot2026!", hash)).toBe(true);
  });

  it("rechaza una contraseña incorrecta", async () => {
    const hash = await hashPassword("Tarot2026!");
    expect(await verifyPassword("otra-cosa", hash)).toBe(false);
  });

  it("nunca guarda la contraseña en texto plano dentro del hash", async () => {
    const hash = await hashPassword("Tarot2026!");
    expect(hash).not.toContain("Tarot2026!");
  });
});
