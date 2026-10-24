import { expect, test } from "./fixtures";
import { signIn } from "./session";

test.skip(
  !process.env.AUTH_SECRET,
  "Define AUTH_SECRET para simular la sesión",
);

test.beforeEach(async ({ context, baseURL }) => {
  await signIn(context, baseURL!);
});

test("crea un pedido, aparece en la tabla y se puede eliminar", async ({
  page,
}) => {
  await page.goto("/orders/new");
  await page
    .getByRole("combobox", { name: "Cliente", exact: true })
    .selectOption({ index: 1 });

  await page
    .getByRole("searchbox", { name: "Buscar producto para agregar" })
    .fill("ELE-0001");
  await page
    .getByRole("list", { name: "Resultados" })
    .getByRole("button")
    .first()
    .click();
  await page.getByRole("spinbutton", { name: /^Cantidad de/ }).fill("2");
  await expect(page.getByTestId("order-total")).not.toHaveText("$0.00");

  await page.getByRole("button", { name: "Crear pedido" }).click();
  const toast = page.getByText(/^Pedido ORD-\d{4,} creado$/);
  await expect(toast).toBeVisible();
  const code = (await toast.textContent())!.match(/ORD-\d+/)![0];
  await expect(page).toHaveURL(/\/orders$/);

  await page
    .getByRole("searchbox", { name: "Buscar por código o cliente" })
    .fill(code);
  const row = page.getByRole("row", { name: new RegExp(code) });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Pendiente");

  // Limpieza: elimina el pedido creado.
  await row.getByRole("link", { name: code }).click();
  await expect(
    page.getByText(`Pedido ${code}`, { exact: false }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Eliminar pedido" }).click();
  await page
    .getByRole("dialog", { name: "Eliminar pedido" })
    .getByRole("button", { name: "Eliminar" })
    .click();
  await expect(page.getByText(`Pedido ${code} eliminado`)).toBeVisible();
});

test("filtra los pedidos por estado desde la URL", async ({ page }) => {
  await page.goto("/orders?status=CANCELLED");
  await expect(
    page.getByRole("combobox", { name: "Estado", exact: true }),
  ).toHaveValue("CANCELLED");
  const rows = page.getByRole("table", { name: "Pedidos" }).locator("tbody tr");
  await expect(rows.first()).toContainText("Cancelado");
  for (const text of await rows.allTextContents()) {
    expect(text).toContain("Cancelado");
  }
});
