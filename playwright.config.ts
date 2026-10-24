import { defineConfig, devices } from "@playwright/test";

// Con PLAYWRIGHT_BASE_URL las pruebas corren contra un despliegue ya existente
// (p. ej. producción); sin ella, levantan `next start` sobre el build local.
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const port = Number(process.env.PORT ?? 3100);

// En local, las pruebas comparten los secretos de .env.local con el servidor
// (AUTH_SECRET para simular la sesión, TEST_ENDPOINTS_TOKEN para el reset).
// Las variables ya definidas en el entorno no se sobrescriben.
if (!externalBaseURL) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Sin .env.local (p. ej. en CI): se usan las variables del entorno.
  }
}

export default defineConfig({
  // Contra un despliegue remoto la latencia varía (arranques en frío de las
  // funciones): se amplían las esperas para no confundir lentitud con fallos.
  expect: { timeout: externalBaseURL ? 10_000 : 5_000 },
  testDir: "./e2e",
  // En serie: varias pruebas usan reset-data y modifican pedidos concretos.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: externalBaseURL ?? `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  // Chromium siempre; con E2E_ALL_BROWSERS=1 también Firefox y WebKit (Safari).
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    ...(process.env.E2E_ALL_BROWSERS
      ? [
          { name: "firefox", use: { ...devices["Desktop Firefox"] } },
          { name: "webkit", use: { ...devices["Desktop Safari"] } },
        ]
      : []),
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: `npm run start -- --port ${port}`,
        url: `http://localhost:${port}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
