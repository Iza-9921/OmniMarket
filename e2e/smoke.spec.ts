import { expect, test } from "./fixtures";

test("la página de login carga sin errores de consola", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { level: 1, name: "Inicia sesión" }),
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
