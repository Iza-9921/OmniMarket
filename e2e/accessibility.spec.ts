import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { signIn } from "./session";

// Revisión automática de accesibilidad (WCAG 2.1 A y AA) con axe-core en cada
// pantalla. La guardia de consola de `fixtures` también aplica: recorrer todas
// las rutas sin errores de consola cubre RF-73.

async function expectAccessible(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const summary = violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help}\n${v.nodes
        .slice(0, 3)
        .map((n) => `  ${n.target.join(" ")}`)
        .join("\n")}`,
  );
  expect(summary, "infracciones de accesibilidad").toEqual([]);
}

test.describe("páginas públicas", () => {
  for (const [path, heading] of [
    ["/login", "Inicia sesión"],
    ["/privacidad", "Política de privacidad"],
    ["/terminos", "Condiciones del servicio"],
  ] as const) {
    test(`${path} cumple WCAG AA`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
      await expectAccessible(page);
    });
  }
});

test.describe("con sesión", () => {
  test.skip(
    !process.env.AUTH_SECRET,
    "Define AUTH_SECRET para simular la sesión",
  );

  test.beforeEach(async ({ context, baseURL }) => {
    await signIn(context, baseURL!);
  });

  test("dashboard, con las tablas de datos abiertas", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByTestId("kpi-revenue")).toBeVisible();
    await page.getByText("Ver ingresos por día").click();
    await page.getByText("Ver ingresos por categoría").click();
    await expectAccessible(page);
  });

  test("listado de productos y diálogo de eliminar", async ({ page }) => {
    await page.goto("/products");
    await expect(page.getByText(/^Mostrando/)).toBeVisible();
    await expectAccessible(page);

    // Selección de filas: aparece la barra de edición en lote.
    await page.getByRole("checkbox").nth(1).check();
    await expectAccessible(page);
  });

  test("listado de pedidos", async ({ page }) => {
    await page.goto("/orders");
    await expect(page.getByText(/^Mostrando/)).toBeVisible();
    await expectAccessible(page);
  });

  test("tablero Kanban", async ({ page }) => {
    await page.goto("/kanban");
    await expect(
      page.getByRole("heading", { name: /^Pendiente/ }).first(),
    ).toBeVisible();
    await expectAccessible(page);
  });

  test("formularios de alta y edición", async ({ page }) => {
    const product = (
      await (await page.request.get("/api/products?limit=1")).json()
    ).data[0];
    const order = (await (await page.request.get("/api/orders?limit=1")).json())
      .data[0];

    for (const [path, ready] of [
      ["/products/new", "Precio de venta"],
      [`/products/${product.id}`, "Precio de venta"],
      ["/orders/new", "Productos"],
      [`/orders/${order.id}`, "Productos"],
    ]) {
      await page.goto(path);
      await expect(page.getByText(ready).first()).toBeVisible();
      await expectAccessible(page);
    }
  });

  test("formulario con errores de validación", async ({ page }) => {
    await page.goto("/products/new");
    await page.getByRole("button", { name: /Crear producto/ }).click();
    await expect(page.getByRole("alert").first()).toBeVisible();
    await expectAccessible(page);
  });

  test.describe("página 404", () => {
    // El propio navegador registra "Failed to load resource" para cualquier
    // documento que responde 404; no es un error de la aplicación.
    test.use({ allowedConsoleErrors: [/status of 404/] });

    test("muestra la página propia y cumple WCAG AA", async ({ page }) => {
      const response = await page.goto("/esta-ruta-no-existe");
      expect(response?.status()).toBe(404);
      await expect(
        page.getByRole("heading", { name: "No encontramos esta página" }),
      ).toBeVisible();
      await expectAccessible(page);
    });
  });
});
