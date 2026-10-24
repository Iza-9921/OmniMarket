import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { signIn } from "./session";

// Edición en lote (RF-50…54). Los productos se crean aquí y se borran al final;
// los pedidos se restauran con reset-data, así que puede correr en producción.

const token = process.env.TEST_ENDPOINTS_TOKEN;
test.skip(
  !process.env.AUTH_SECRET || !token,
  "Define AUTH_SECRET y TEST_ENDPOINTS_TOKEN",
);
test.describe.configure({ mode: "serial" });

const prefix = `E2E-B${Date.now().toString(36).toUpperCase()}`;
const skus = [1, 2, 3].map((n) => `${prefix}-${n}`);
const createdIds: string[] = [];

test.beforeAll(async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  await signIn(context, baseURL!);
  for (const [i, sku] of skus.entries()) {
    const response = await context.request.post("/api/products", {
      data: {
        sku,
        name: `Lote ${sku}`,
        categoryId: 1,
        price: `${100 * (i + 1)}.00`,
        cost: "50.00",
        stock: 10,
        status: "ACTIVE",
      },
    });
    expect(response.status()).toBe(201);
    createdIds.push((await response.json()).id);
  }
  await context.close();
});

test.afterAll(async ({ browser, baseURL, request }) => {
  const context = await browser.newContext();
  await signIn(context, baseURL!);
  for (const id of createdIds)
    await context.request.delete(`/api/products/${id}`);
  await context.close();
  await request.post("/api/test/reset-data", {
    headers: { "x-test-token": token! },
  });
});

test.beforeEach(async ({ context, baseURL }) => {
  await signIn(context, baseURL!);
});

async function openBatch(page: Page) {
  await page.goto(`/products?q=${prefix}&sort=name&dir=asc`);
  await expect(page.getByRole("row", { name: new RegExp(prefix) })).toHaveCount(
    3,
  );
}

const bar = (page: Page) =>
  page.getByRole("region", { name: "Acciones en lote" });

test("selecciona varias filas y ajusta su precio en lote", async ({ page }) => {
  await openBatch(page);
  await expect(bar(page)).toHaveCount(0);

  await page
    .getByRole("checkbox", {
      name: "Seleccionar todas las filas de esta página",
    })
    .check();
  await expect(bar(page)).toContainText("3 seleccionados");

  await bar(page)
    .getByRole("combobox", { name: "Acción en lote" })
    .selectOption({ label: "Ajustar precio (%)" });
  await bar(page).getByRole("textbox", { name: "Nuevo valor" }).fill("10");
  await bar(page).getByRole("button", { name: "Aplicar a 3" }).click();

  await expect(page.getByText("3 productos actualizados")).toBeVisible();
  await expect(bar(page)).toHaveCount(0); // la selección se limpia
  const rows = page.getByRole("row", { name: new RegExp(prefix) });
  await expect(rows.nth(0)).toContainText("$110.00");
  await expect(rows.nth(1)).toContainText("$220.00");
  await expect(rows.nth(2)).toContainText("$330.00");
});

test("cambia el estado solo de las filas marcadas", async ({ page }) => {
  await openBatch(page);
  await page
    .getByRole("checkbox", { name: `Seleccionar Lote ${skus[0]}` })
    .check();
  await page
    .getByRole("checkbox", { name: `Seleccionar Lote ${skus[2]}` })
    .check();
  await expect(bar(page)).toContainText("2 seleccionados");

  await bar(page)
    .getByRole("combobox", { name: "Nuevo valor" })
    .selectOption({ label: "Borrador" });
  await bar(page).getByRole("button", { name: "Aplicar a 2" }).click();

  await expect(page.getByText("2 productos actualizados")).toBeVisible();
  const rows = page.getByRole("row", { name: new RegExp(prefix) });
  await expect(rows.nth(0)).toContainText("Borrador");
  await expect(rows.nth(1)).toContainText("Activo");
  await expect(rows.nth(2)).toContainText("Borrador");
});

test("valida el valor antes de aplicar", async ({ page }) => {
  await openBatch(page);
  await page
    .getByRole("checkbox", { name: `Seleccionar Lote ${skus[1]}` })
    .check();
  await bar(page)
    .getByRole("combobox", { name: "Acción en lote" })
    .selectOption({ label: "Fijar stock" });
  await bar(page).getByRole("textbox", { name: "Nuevo valor" }).fill("-3");
  await expect(bar(page).getByRole("alert")).toHaveText(
    "El stock no puede ser negativo",
  );
  await expect(
    bar(page).getByRole("button", { name: "Aplicar a 1" }),
  ).toBeDisabled();
});

test.describe("si el servidor rechaza el lote", () => {
  test.use({ allowedConsoleErrors: [/status of 500/] });

  test("las filas vuelven a su valor anterior y se avisa", async ({ page }) => {
    await page.route("**/api/products/bulk", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "INTERNAL_ERROR" }),
      });
    });

    await openBatch(page);
    const rows = page.getByRole("row", { name: new RegExp(prefix) });
    await page
      .getByRole("checkbox", {
        name: "Seleccionar todas las filas de esta página",
      })
      .check();
    await bar(page)
      .getByRole("combobox", { name: "Acción en lote" })
      .selectOption({ label: "Fijar stock" });
    await bar(page).getByRole("textbox", { name: "Nuevo valor" }).fill("0");
    await bar(page).getByRole("button", { name: "Aplicar a 3" }).click();

    // Optimista: antes de la respuesta (800 ms) las filas ya muestran el cambio…
    await expect(rows.nth(1)).toContainText("Agotado", { timeout: 700 });
    // …y al fallar vuelven a su valor anterior.
    await expect(page.getByText(/se revirtieron/)).toBeVisible();
    await expect(rows.nth(1)).toContainText("10");
    await expect(rows.nth(1)).not.toContainText("Agotado");
  });
});

test("cambia el estado de varios pedidos y se refleja en el Kanban", async ({
  page,
}) => {
  await page.goto("/orders?status=PENDING&q=ORD-000");
  for (const code of ["ORD-0001", "ORD-0002"]) {
    await page.getByRole("checkbox", { name: `Seleccionar ${code}` }).check();
  }
  await bar(page)
    .getByRole("combobox", { name: "Nuevo estado" })
    .selectOption({ label: "Enviado" });
  await bar(page).getByRole("button", { name: "Aplicar a 2" }).click();

  await expect(page.getByText("2 pedidos movidos a «Enviado»")).toBeVisible();
  for (const code of ["ORD-0001", "ORD-0002"]) {
    const status = await page.request.get(
      `/api/test/kanban-status?orderId=${code}`,
    );
    expect(await status.json()).toMatchObject({
      status: "SHIPPED",
      lastMove: { from: "PENDING", to: "SHIPPED", source: "BULK" },
    });
  }

  await page.goto("/kanban");
  await expect(
    page.getByTestId("column-SHIPPED").getByTestId("card-ORD-0001"),
  ).toBeVisible();
});
