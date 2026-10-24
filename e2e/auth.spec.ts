import { expect, test } from "./fixtures";
import { sessionCookie, TEST_USER } from "./session";

// Flujo E2E 1 (§5): redirección de rutas privadas y simulación de sesión.

test.describe("sin sesión", () => {
  test("las rutas privadas redirigen a /login recordando el destino", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fdashboard$/);

    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("las APIs privadas responden 401 sin sesión", async ({ request }) => {
    for (const path of ["/api/products", "/api/orders", "/api/catalog"]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(401);
    }
    const create = await request.post("/api/products", { data: {} });
    expect(create.status()).toBe(401);
  });

  test("el login ofrece solo Google y GitHub, sin contraseña", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle("Iniciar sesión · OmniMarket");
    await expect(
      page.getByRole("button", { name: "Continuar con Google" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continuar con GitHub" }),
    ).toBeVisible();
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
  });
});

test.describe("con sesión simulada", () => {
  test.skip(
    !process.env.AUTH_SECRET,
    "Define AUTH_SECRET para simular la sesión",
  );

  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([await sessionCookie(baseURL!)]);
  });

  test("entra al dashboard y muestra el usuario con rol Operador", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByTestId("user-name")).toHaveText(TEST_USER.name);
    await expect(page.getByTestId("user-role")).toHaveText("Operador");
    await expect(page.getByTestId("greeting")).toContainText("Evaluadora");
  });

  test("con sesión, /login lleva directamente al dashboard", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("cerrar sesión vuelve a proteger las rutas privadas", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fdashboard$/);
  });

  test("las respuestas del proxy nunca reescriben la cookie de sesión", async ({
    page,
  }) => {
    // Si el proxy renovara la cookie, un prefetch que responde después de
    // cerrar sesión volvería a abrirla (visto en producción).
    const pages = ["/dashboard", "/products", "/orders", "/privacidad"];
    for (const path of pages) {
      const response = await page.goto(path);
      const setCookie = (await response!.headersArray()).filter(
        (h) =>
          h.name.toLowerCase() === "set-cookie" &&
          h.value.includes("session-token"),
      );
      expect(setCookie, path).toEqual([]);
    }
  });
});
