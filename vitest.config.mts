import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    // Los tests de reservas dependen de `Date.now()` real y de una base de
    // datos Postgres real — correrlos en paralelo sin cuidado podría pisarse
    // entre sí sobre la misma tabla `Counter`/índice único parcial. Se corren
    // en serie: son pocos y rápidos, no vale la pena la complejidad de
    // aislar cada test en su propia transacción.
    fileParallelism: false,
    testTimeout: 15000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "./tests/stubs/server-only.ts"),
    },
  },
});
