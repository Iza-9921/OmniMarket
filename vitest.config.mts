import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Base de datos de las pruebas de integración. En CI la define el workflow.
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/omnimarket_test";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          setupFiles: ["./tests/setup.ts"],
          include: ["tests/unit/**/*.test.{ts,tsx}"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["./tests/integration/global-setup.ts"],
          // Comparten una base de datos: se ejecutan en serie.
          fileParallelism: false,
          env: {
            DATABASE_URL: testDatabaseUrl,
            TEST_ENDPOINTS_TOKEN: "integration-test-token",
          },
        },
      },
    ],
  },
});
