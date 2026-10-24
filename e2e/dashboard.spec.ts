import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { signIn } from "./session";

// Dashboard analítico (RF-10…14). Sus KPIs deben coincidir con los de
// GET /api/test/analytics para el mismo rango (mismo servicio).

test.skip(
  !process.env.AUTH_SECRET,
  "Define AUTH_SECRET para simular la sesión",
);

test.beforeEach(async ({ context, baseURL }) => {
  await signIn(context, baseURL!);
});

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
});

/** Navega y devuelve el rango que resolvió el servidor. */
async function openDashboard(page: Page, query: string) {
  const response = page.waitForResponse((r) =>
    r.url().includes("/api/dashboard?"),
  );
  await page.goto(`/dashboard${query}`);
  const body = await (await response).json();
  await expect(page.getByTestId("kpi-revenue")).toBeVisible();
  return body.range as { from: string; to: string };
}

async function expectKpisMatchAnalytics(
  page: Page,
  range: { from: string; to: string },
) {
  const analytics = await page.request.get(
    `/api/test/analytics?limit=1&from=${range.from}&to=${range.to}`,
  );
  const { summary } = await analytics.json();
  await expect(page.getByTestId("kpi-revenue")).toHaveText(
    money.format(summary.revenue),
  );
  await expect(page.getByTestId("kpi-orders")).toHaveText(
    summary.orders.toLocaleString("es-MX"),
  );
  await expect(page.getByTestId("kpi-avg-ticket")).toHaveText(
    money.format(summary.avgTicket),
  );
  await expect(page.getByTestId("kpi-margin")).toHaveText(
    money.format(summary.grossMargin),
  );
}

test("muestra skeletons mientras cargan las métricas", async ({ page }) => {
  await page.route("**/api/dashboard?*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.continue();
  });
  await page.goto("/dashboard");
  await expect(page.locator('[aria-busy="true"]').first()).toBeVisible();
  await expect(page.getByTestId("kpi-revenue")).toBeVisible();
});

test("los KPIs de los últimos 30 días coinciden con /api/test/analytics", async ({
  page,
}) => {
  const range = await openDashboard(page, "");
  await expect(page.getByRole("button", { name: "30 días" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expectKpisMatchAnalytics(page, range);
  await expect(
    page.getByRole("heading", { name: "Ingresos por día" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ingresos por categoría" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("table", { name: "Productos más vendidos" })
      .locator("tbody tr"),
  ).toHaveCount(5);
});

test("cambiar el periodo actualiza la URL y las cifras", async ({ page }) => {
  await openDashboard(page, "");
  const orders30 = await page.getByTestId("kpi-orders").textContent();

  const response = page.waitForResponse((r) => r.url().includes("range=7d"));
  await page.getByRole("button", { name: "7 días" }).click();
  const range = (await (await response).json()).range;
  await expect(page).toHaveURL(/range=7d/);
  await expect(page.getByTestId("kpi-orders")).not.toHaveText(orders30!);
  await expectKpisMatchAnalytics(page, range);
});

test("aplica un rango de fechas personalizado", async ({ page }) => {
  const last30 = await openDashboard(page, "");
  // Del inicio de los 30 días a una semana después.
  const to = new Date(Date.parse(`${last30.from}T00:00:00Z`) + 6 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  await page.getByLabel("Desde").fill(last30.from);
  await page.getByLabel("Hasta").fill(to);
  await page.getByRole("button", { name: "Aplicar" }).click();

  await expect(page).toHaveURL(
    new RegExp(`range=custom&from=${last30.from}&to=${to}`),
  );
  await expectKpisMatchAnalytics(page, { from: last30.from, to });
});

test("la tabla de datos de la gráfica está disponible sin pasar el ratón", async ({
  page,
}) => {
  await openDashboard(page, "?range=7d");
  await page.getByText("Ver ingresos por día").click();
  const rows = page.locator("details[open] tbody tr");
  await expect(rows).toHaveCount(7);
});
