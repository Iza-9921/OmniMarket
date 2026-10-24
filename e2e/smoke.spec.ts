import { expect, test } from "./fixtures";

test("la página de login carga sin errores de consola", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { level: 1, name: "Inicia sesión" }),
  ).toBeVisible();
});

test("las páginas legales son públicas y se enlazan desde el login", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "política de privacidad" }).click();
  await expect(page).toHaveURL(/\/privacidad$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Política de privacidad" }),
  ).toBeVisible();

  await page.goto("/terminos");
  await expect(
    page.getByRole("heading", { level: 1, name: "Condiciones del servicio" }),
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
