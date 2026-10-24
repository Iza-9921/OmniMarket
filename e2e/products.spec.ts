import { expect, test } from "./fixtures";
import { signIn } from "./session";

// Flujo E2E 2 (§5): registro de un producto nuevo y su reflejo en la tabla.
// Recorre el CRUD completo y al final elimina el producto creado, así que
// también se puede ejecutar contra producción sin dejar residuos.

test.describe.configure({ mode: "serial" });
test.skip(
  !process.env.AUTH_SECRET,
  "Define AUTH_SECRET para simular la sesión",
);

const sku = `E2E-${Date.now().toString(36).toUpperCase()}`;
const name = `Producto E2E ${sku}`;

test.beforeEach(async ({ context, baseURL }) => {
  await signIn(context, baseURL!);
});

async function searchSku(page: import("@playwright/test").Page) {
  await page.goto("/products");
  await page
    .getByRole("searchbox", { name: "Buscar por nombre o SKU" })
    .fill(sku);
  await expect(page).toHaveURL(new RegExp(`q=${sku}`));
}

test("crea un producto y aparece en la tabla", async ({ page }) => {
  await page.goto("/products");
  await page.getByRole("link", { name: "Nuevo producto" }).click();
  await expect(page).toHaveURL(/\/products\/new$/);
  await expect(
    page.getByRole("heading", { name: "Nuevo producto" }),
  ).toBeVisible();

  await page.getByRole("textbox", { name: "SKU", exact: true }).fill(sku);
  await page.getByRole("textbox", { name: "Nombre", exact: true }).fill(name);
  await page
    .getByRole("combobox", { name: "Categoría", exact: true })
    .selectOption({ label: "Electrónica" });
  await page
    .getByRole("textbox", { name: "Precio de venta (MXN)" })
    .fill("349.50");
  await page.getByRole("textbox", { name: "Costo (MXN)" }).fill("200");
  await expect(page.getByText("Margen bruto: 42.78%")).toBeVisible();
  await page.getByRole("spinbutton", { name: "Stock (unidades)" }).fill("12");
  await page.getByRole("button", { name: "Crear producto" }).click();

  await expect(page.getByText(`Producto «${name}» creado`)).toBeVisible();
  await expect(page).toHaveURL(/\/products$/);

  await searchSku(page);
  const row = page.getByRole("row", { name: new RegExp(sku) });
  await expect(row).toBeVisible();
  await expect(row).toContainText(name);
  await expect(row).toContainText("$349.50");
  await expect(row).toContainText("Activo");
});

test("valida el formulario en el navegador sin enviarlo", async ({ page }) => {
  await page.goto("/products/new");
  await page.getByRole("textbox", { name: "Precio de venta (MXN)" }).fill("-5");
  await page.getByRole("button", { name: "Crear producto" }).click();

  const alerts = page.getByRole("alert");
  await expect(alerts.filter({ hasText: "Elige una categoría" })).toBeVisible();
  await expect(
    alerts.filter({ hasText: "Escribe al menos 2 caracteres" }),
  ).toBeVisible();
  await expect(alerts.filter({ hasText: "Usa un importe válido" })).toHaveCount(
    2,
  );
  await expect(page).toHaveURL(/\/products\/new$/);
});

test("rechaza un SKU repetido con un mensaje claro", async ({ page }) => {
  await page.goto("/products/new");
  await page.getByRole("textbox", { name: "SKU", exact: true }).fill(sku);
  await page
    .getByRole("textbox", { name: "Nombre", exact: true })
    .fill("Duplicado");
  await page
    .getByRole("combobox", { name: "Categoría", exact: true })
    .selectOption({ label: "Hogar" });
  await page.getByRole("textbox", { name: "Precio de venta (MXN)" }).fill("10");
  await page.getByRole("textbox", { name: "Costo (MXN)" }).fill("5");
  await page.getByRole("button", { name: "Crear producto" }).click();

  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Ya existe un producto con ese SKU." }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/products\/new$/);
});

test("edita el producto y la tabla refleja el cambio", async ({ page }) => {
  await searchSku(page);
  await page.getByRole("link", { name }).click();
  await expect(
    page.getByRole("heading", { name: "Editar producto" }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "SKU", exact: true }),
  ).toHaveValue(sku);

  await page
    .getByRole("textbox", { name: "Precio de venta (MXN)" })
    .fill("399.00");
  await page
    .getByRole("combobox", { name: "Estado", exact: true })
    .selectOption({ label: "Borrador" });
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page.getByText("Producto actualizado")).toBeVisible();
  await searchSku(page);
  const row = page.getByRole("row", { name: new RegExp(sku) });
  await expect(row).toContainText("$399.00");
  await expect(row).toContainText("Borrador");
});

test("elimina el producto tras confirmar en el modal", async ({ page }) => {
  await searchSku(page);
  await page.getByRole("button", { name: `Eliminar ${name}` }).click();

  const dialog = page.getByRole("dialog", { name: "Eliminar producto" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Eliminar" }).click();

  await expect(page.getByText(`Producto «${name}» eliminado`)).toBeVisible();
  await expect(
    page.getByText("No hay productos que coincidan con los filtros."),
  ).toBeVisible();
});

test("borrar mientras una búsqueda está en camino no deja la fila en la tabla", async ({
  page,
}) => {
  const raceSku = `E2E-R${Date.now().toString(36).toUpperCase()}`;
  const raceName = `Carrera ${raceSku}`;
  const created = await page.request.post("/api/products", {
    data: {
      sku: raceSku,
      name: raceName,
      categoryId: 1,
      price: "10.00",
      cost: "5.00",
      stock: 1,
      status: "ACTIVE",
    },
  });
  expect(created.status()).toBe(201);

  // La búsqueda tarda 1.5 s: sale antes del borrado y responde después, con
  // el producto todavía incluido (visto en producción).
  await page.route(/\/api\/products\?.*q=/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });

  await page.goto("/products");
  const row = page.getByRole("row", { name: new RegExp(raceSku) });
  await expect(row).toBeVisible(); // el más reciente aparece primero
  await page
    .getByRole("searchbox", { name: "Buscar por nombre o SKU" })
    .fill(raceSku);
  await page.waitForTimeout(400); // la búsqueda ya salió (retardo de 300 ms)

  await row.getByRole("button", { name: `Eliminar ${raceName}` }).click();
  await page
    .getByRole("dialog", { name: "Eliminar producto" })
    .getByRole("button", { name: "Eliminar" })
    .click();
  await expect(
    page.getByText(`Producto «${raceName}» eliminado`),
  ).toBeVisible();

  await page.waitForTimeout(2000); // llega la respuesta vieja de la búsqueda
  await expect(
    page.getByRole("row", { name: new RegExp(raceSku) }),
  ).toHaveCount(0);
});
