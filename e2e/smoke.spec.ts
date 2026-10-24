import { expect, test } from "./fixtures";

// Prueba de humo de F0. Los tres flujos E2E obligatorios (§5) llegan en F2–F4.
test("la página principal carga sin errores de consola", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("OmniMarket · Operations Hub");
  await expect(
    page.getByRole("heading", { level: 1, name: "Operations Hub" }),
  ).toBeVisible();
});

test("el endpoint de salud responde ok", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await response.json()).toMatchObject({
    status: "ok",
    service: "omnimarket-operations-hub",
  });
});
