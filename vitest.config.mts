import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` lanza un error fuera de Next.js; en las pruebas no aplica.
      "server-only": fileURLToPath(new URL("./pruebas/simulaciones/server-only.ts", import.meta.url)),
    },
  },
  test: {
    include: ["pruebas/**/*.test.ts"],
    environment: "node",
    testTimeout: 30_000,
  },
});
