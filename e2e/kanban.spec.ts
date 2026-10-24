import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { signIn } from "./session";

// Flujo E2E 3 (§5): arrastre de una tarjeta en el Kanban y aserción del cambio
// de columna. Empieza y termina con reset-data para trabajar sobre datos conocidos.

const token = process.env.TEST_ENDPOINTS_TOKEN;
test.skip(
  !process.env.AUTH_SECRET || !token,
  "Define AUTH_SECRET y TEST_ENDPOINTS_TOKEN",
);
test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ request }) => {
  const reset = await request.post("/api/test/reset-data", {
    headers: { "x-test-token": token! },
  });
  expect(reset.status()).toBe(200);
});

test.afterAll(async ({ request }) => {
  await request.post("/api/test/reset-data", {
    headers: { "x-test-token": token! },
  });
});

test.beforeEach(async ({ context, baseURL }) => {
  await signIn(context, baseURL!);
});

const column = (page: Page, status: string) =>
  page.getByTestId(`column-${status}`);

/** Arrastra con el ratón paso a paso, como lo haría una persona. */
async function drag(page: Page, card: Locator, target: Locator) {
  const from = (await card.boundingBox())!;
  const to = (await target.boundingBox())!;
  const startX = from.x + from.width / 2;
  const startY = from.y + from.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 12, startY + 12, { steps: 4 }); // supera los 6 px de activación
  await page.mouse.move(to.x + to.width / 2, to.y + 120, { steps: 20 });
  await page.mouse.up();
}

async function kanbanStatus(page: Page, code: string) {
  const response = await page.request.get(
    `/api/test/kanban-status?orderId=${code}`,
  );
  return response.json();
}

test("arrastra un pedido a otra columna: se mueve al instante y persiste", async ({
  page,
}) => {
  // Retrasa la respuesta del servidor para comprobar que el cambio es optimista.
  await page.route("**/api/orders/*/status", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });

  await page.goto("/kanban");
  const card = column(page, "PENDING").getByTestId("card-ORD-0001");
  await expect(card).toBeVisible();
  await expect(page.getByTestId("column-PENDING-total")).toHaveText("13");
  await expect(page.getByTestId("column-PROCESSING-total")).toHaveText("26");

  await drag(page, card, column(page, "PROCESSING"));

  // Antes de que responda el servidor (1.5 s), la tarjeta ya está en su nueva columna.
  await expect(
    column(page, "PROCESSING").getByTestId("card-ORD-0001"),
  ).toBeVisible({ timeout: 1000 });
  await expect(
    column(page, "PENDING").getByTestId("card-ORD-0001"),
  ).toHaveCount(0);
  await expect(page.getByTestId("column-PENDING-total")).toHaveText("12");
  await expect(page.getByTestId("column-PROCESSING-total")).toHaveText("27");

  await expect(page.getByText("ORD-0001 movido a «En proceso»")).toBeVisible();

  // Persistencia: tras recargar sigue en la nueva columna…
  await page.reload();
  await expect(
    column(page, "PROCESSING").getByTestId("card-ORD-0001"),
  ).toBeVisible();
  // …y el endpoint de auditoría lo confirma.
  expect(await kanbanStatus(page, "ORD-0001")).toMatchObject({
    status: "PROCESSING",
    lastMove: { from: "PENDING", to: "PROCESSING", source: "KANBAN" },
  });
});

test.describe("si el servidor rechaza el cambio", () => {
  test.use({ allowedConsoleErrors: [/status of 500/] });

  test("la tarjeta vuelve a su columna y se avisa con un toast", async ({
    page,
  }) => {
    await page.route("**/api/orders/*/status", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "INTERNAL_ERROR" }),
      }),
    );

    await page.goto("/kanban");
    const card = column(page, "PENDING").getByTestId("card-ORD-0002");
    await expect(card).toBeVisible();

    await drag(page, card, column(page, "SHIPPED"));

    await expect(page.getByText(/ORD-0002 volvió a «Pendiente»/)).toBeVisible();
    await expect(
      column(page, "PENDING").getByTestId("card-ORD-0002"),
    ).toBeVisible();
    await expect(
      column(page, "SHIPPED").getByTestId("card-ORD-0002"),
    ).toHaveCount(0);
    await expect(page.getByTestId("column-PENDING-total")).toHaveText("12");
    expect((await kanbanStatus(page, "ORD-0002")).status).toBe("PENDING");
  });
});

test("se puede mover sin arrastrar con el selector «Mover a» (teclado)", async ({
  page,
}) => {
  await page.goto("/kanban");
  await column(page, "PENDING")
    .getByRole("combobox", { name: "Mover ORD-0003 a" })
    .selectOption({ label: "Enviado" });

  await expect(page.getByText("ORD-0003 movido a «Enviado»")).toBeVisible();
  await expect(
    column(page, "SHIPPED").getByTestId("card-ORD-0003"),
  ).toBeVisible();
  expect((await kanbanStatus(page, "ORD-0003")).status).toBe("SHIPPED");
});

test("se arrastra con el teclado desde el asa de la tarjeta", async ({
  page,
}) => {
  await page.goto("/kanban");
  const handle = page.getByRole("button", {
    name: /^Arrastrar pedido ORD-0011,/,
  });
  // En un despliegue remoto el tablero puede tardar en volverse interactivo:
  // se reintenta hasta que dnd-kit confirma que el arrastre empezó.
  await expect(async () => {
    await handle.press("Space");
    await expect(handle).toHaveAttribute("aria-pressed", "true", {
      timeout: 1_000,
    });
  }).toPass();
  // Cada flecha desplaza la tarjeta 25 px: 12 la llevan a la columna de al lado.
  for (let i = 0; i < 12; i++) await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");

  await expect(page.getByText("ORD-0011 movido a «En proceso»")).toBeVisible();
  await expect(
    column(page, "PROCESSING").getByTestId("card-ORD-0011"),
  ).toBeVisible();
  expect((await kanbanStatus(page, "ORD-0011")).status).toBe("PROCESSING");
});
