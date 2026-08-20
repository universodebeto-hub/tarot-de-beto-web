import { describe, it, expect } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("permite hasta el límite y luego bloquea", () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, 5, 60_000).allowed).toBe(true);
    }
    const blocked = checkRateLimit(key, 5, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("no comparte contador entre claves distintas", () => {
    const keyA = `test:${Math.random()}`;
    const keyB = `test:${Math.random()}`;
    for (let i = 0; i < 5; i++) checkRateLimit(keyA, 5, 60_000);
    expect(checkRateLimit(keyA, 5, 60_000).allowed).toBe(false);
    expect(checkRateLimit(keyB, 5, 60_000).allowed).toBe(true);
  });

  it("vuelve a permitir después de que la ventana expira", async () => {
    const key = `test:${Math.random()}`;
    expect(checkRateLimit(key, 1, 20).allowed).toBe(true);
    expect(checkRateLimit(key, 1, 20).allowed).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(checkRateLimit(key, 1, 20).allowed).toBe(true);
  });
});
