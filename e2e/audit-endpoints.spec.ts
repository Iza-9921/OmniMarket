import { expect, test } from "./fixtures";

// Endpoints de auditoría (§2). Contra producción:
//   PLAYWRIGHT_BASE_URL=https://… TEST_ENDPOINTS_TOKEN=… npm run test:e2e
const token = process.env.TEST_ENDPOINTS_TOKEN;

test.describe.configure({ mode: "serial" });

test("reset-data rechaza peticiones sin token", async ({ request }) => {
  const response = await request.post("/api/test/reset-data");
  expect(response.status()).toBe(401);
});

test("reset-data con token restablece el conjunto de prueba", async ({
  request,
}) => {
  test.skip(!token, "Define TEST_ENDPOINTS_TOKEN para probar el reset");
  const response = await request.post("/api/test/reset-data", {
    headers: { "x-test-token": token! },
  });
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({
    ok: true,
    seed: "omnimarket-v1",
    counts: { orders: 1500 },
  });
});

test("analytics devuelve métricas paginadas", async ({ request }) => {
  const response = await request.get("/api/test/analytics?page=1&limit=50");
  expect(response.status()).toBe(200);

  const body = await response.json();
  expect(body.data).toHaveLength(50);
  expect(body.pagination).toMatchObject({ page: 1, limit: 50 });
  expect(body.summary.orders).toBeGreaterThan(0);
  expect(body.meta.durationMs).toBeLessThan(300);
});

test("kanban-status devuelve el estado de un pedido ancla", async ({
  request,
}) => {
  const response = await request.get(
    "/api/test/kanban-status?orderId=ORD-0001",
  );
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({
    orderId: "ORD-0001",
    status: "PENDING",
  });
});
