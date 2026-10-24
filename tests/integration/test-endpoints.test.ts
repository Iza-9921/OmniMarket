import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET as getAnalytics } from "@/app/api/test/analytics/route";
import { GET as getKanbanStatus } from "@/app/api/test/kanban-status/route";
import { POST as resetData } from "@/app/api/test/reset-data/route";
import { closeDb, getDb } from "@/server/db/client";
import { orders } from "@/server/db/schema";
import { SEED_COUNTS } from "@/server/db/seed-data";
import { sql } from "drizzle-orm";

const BASE = "http://localhost";
const TOKEN = "integration-test-token";

const reset = (token: string | null = TOKEN) =>
  resetData(
    new Request(`${BASE}/api/test/reset-data`, {
      method: "POST",
      headers: token ? { "x-test-token": token } : {},
    }),
  );
const analytics = (query = "") =>
  getAnalytics(new Request(`${BASE}/api/test/analytics${query}`));
const kanbanStatus = (query = "") =>
  getKanbanStatus(new Request(`${BASE}/api/test/kanban-status${query}`));

beforeAll(async () => {
  const response = await reset();
  expect(response.status).toBe(200);
});

afterAll(async () => {
  await closeDb();
});

describe("POST /api/test/reset-data", () => {
  it("rechaza peticiones sin token o con un token incorrecto", async () => {
    expect((await reset(null)).status).toBe(401);
    expect((await reset("token-incorrecto")).status).toBe(401);
  });

  it("queda deshabilitado (503) si TEST_ENDPOINTS_TOKEN no está configurado", async () => {
    const original = process.env.TEST_ENDPOINTS_TOKEN;
    process.env.TEST_ENDPOINTS_TOKEN = "  \n";
    try {
      expect((await reset()).status).toBe(503);
    } finally {
      process.env.TEST_ENDPOINTS_TOKEN = original;
    }
  });

  it("ignora espacios o saltos de línea alrededor del token configurado", async () => {
    const original = process.env.TEST_ENDPOINTS_TOKEN;
    process.env.TEST_ENDPOINTS_TOKEN = `${TOKEN}\n`;
    try {
      expect((await reset()).status).toBe(200);
    } finally {
      process.env.TEST_ENDPOINTS_TOKEN = original;
    }
  });

  it("es repetible: dos resets dejan exactamente los mismos datos", async () => {
    const snapshot = () =>
      getDb().execute<{
        orders: string;
        subtotal: string;
        statuses: string;
      }>(sql`
        select count(*) as orders, sum(subtotal_cents) as subtotal,
          string_agg(code || ':' || status, ',' order by code) as statuses
        from orders`);

    const first = await reset();
    const body = await first.json();
    expect(body).toMatchObject({
      ok: true,
      seed: "omnimarket-v1",
      counts: { orders: SEED_COUNTS.orders, products: SEED_COUNTS.products },
    });
    const before = (await snapshot()).rows[0];

    await getDb().update(orders).set({ status: "CANCELLED" }); // ensuciar datos
    expect((await reset()).status).toBe(200);
    expect((await snapshot()).rows[0]).toEqual(before);
  });
});

describe("GET /api/test/analytics", () => {
  it("devuelve resumen, página de datos y paginación con la forma acordada", async () => {
    const response = await analytics("?page=1&limit=50");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("server-timing")).toMatch(/^db;.*dur=/);

    const body = await response.json();
    expect(body.data).toHaveLength(50);
    expect(body.pagination).toMatchObject({ page: 1, limit: 50 });
    expect(body.pagination.totalPages).toBe(
      Math.ceil(body.pagination.total / 50),
    );
    expect(body.summary.currency).toBe("MXN");
    expect(body.meta.durationMs).toBeLessThan(300);

    // Más reciente primero.
    const dates = body.data.map((row: { date: string }) => row.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("el resumen coincide con la suma de todas las páginas y excluye cancelados", async () => {
    const all = await (await analytics("?limit=100")).json();
    const rest = await (await analytics("?limit=100&page=2")).json();
    const rows = [...all.data, ...rest.data];
    expect(rows).toHaveLength(all.pagination.total);

    const orderSum = rows.reduce(
      (s: number, r: { orders: number }) => s + r.orders,
      0,
    );
    expect(all.summary.orders).toBe(orderSum);

    const [{ count }] = (
      await getDb().execute<{ count: string }>(
        sql`select count(*) from orders where status <> 'CANCELLED'`,
      )
    ).rows;
    expect(all.summary.orders).toBe(Number(count));
  });

  it("filtra por rango de fechas", async () => {
    const first = await (await analytics("?limit=1")).json();
    const day = first.data[0].date;
    const body = await (await analytics(`?from=${day}&to=${day}`)).json();
    expect(body.data).toHaveLength(1);
    expect(body.summary.orders).toBe(first.data[0].orders);
  });

  it("responde 400 con parámetros inválidos", async () => {
    const response = await analytics("?limit=101");
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "INVALID_QUERY" });
  });
});

describe("GET /api/test/kanban-status", () => {
  it("devuelve el estado y el último movimiento de un pedido ancla", async () => {
    const response = await kanbanStatus("?orderId=ORD-0001");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      orderId: "ORD-0001",
      status: "PENDING",
      version: 1,
      lastMove: { from: null, to: "PENDING", source: "SEED" },
    });
  });

  it("refleja un cambio de estado guardado en la base de datos", async () => {
    await getDb()
      .update(orders)
      .set({ status: "SHIPPED" })
      .where(sql`${orders.code} = 'ORD-0004'`);
    const body = await (await kanbanStatus("?orderId=ORD-0004")).json();
    expect(body.status).toBe("SHIPPED");
  });

  it("sin parámetros devuelve el conteo por columna", async () => {
    const body = await (await kanbanStatus()).json();
    expect(Object.keys(body.columns)).toEqual([
      "PENDING",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
    ]);
    expect(body.total).toBe(SEED_COUNTS.orders);
  });

  it("responde 404 si el pedido no existe y 400 si el formato es inválido", async () => {
    expect((await kanbanStatus("?orderId=ORD-9999")).status).toBe(404);
    expect((await kanbanStatus("?orderId=abc")).status).toBe(400);
  });
});
