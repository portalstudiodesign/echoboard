import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      DATABASE_URL: "pglite://memory",
      BETTER_AUTH_SECRET: "test-secret-that-is-long-enough-for-better-auth",
      BETTER_AUTH_URL: "http://localhost:3000",
    },
    testTimeout: 30_000,
  },
});
