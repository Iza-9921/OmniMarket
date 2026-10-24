import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adjustPrice } from "@/lib/bulk";
import { productListQuerySchema } from "@/lib/schemas/lists";
import { closeDb, getDb } from "@/server/db/client";
import { orderStatusEvents, orders, products } from "@/server/db/schema";
import { NotFoundError } from "@/server/errors";
import { getSalesAnalytics } from "@/server/services/analytics";
import {
  bulkUpdateOrderStatus,
  getKanbanBoard,
} from "@/server/services/orders";
import { bulkUpdateProducts, listProducts } from "@/server/services/products";
import { resetDatabase } from "@/server/services/reset";

const db = () => getDb();
const MISSING = "00000000-0000-4000-8000-000000000000";

beforeAll(async () => {
  await resetDatabase(db());
});

afterAll(async () => {
  await closeDb();
});

async function someProducts(n: number) {
  const { data } = await listProducts(
    db(),
    productListQuerySchema.parse({ status: "ACTIVE", limit: n }),
  );
  return data;
}

describe("edición en lote de productos", () => {
  it("aplica estado, categoría, stock y ajuste de precio a todas las filas", async () => {
    const rows = await someProducts(3);
    const ids = rows.map((r) => r.id);

    const result = await bulkUpdateProducts(db(), ids, {
      status: "DRAFT",
      categoryId: 2,
      stock: 7,
      priceAdjustPct: 10.5,
    });
    expect(result).toEqual({ updated: 3 });

    const after = await db()
      .select()
      .from(products)
      .where(inArray(products.id, ids));
    for (const row of rows) {
      const updated = after.find((a) => a.id === row.id)!;
      expect(updated).toMatchObject({
        status: "DRAFT",
        categoryId: 2,
        stock: 7,
        priceCents: adjustPrice(row.priceCents, 10.5),
      });
    }
  });

  it("es todo o nada: si un producto no existe, no cambia ninguno", async () => {
    const rows = await someProducts(2);
    const error = await bulkUpdateProducts(
      db(),
      [...rows.map((r) => r.id), MISSING],
      {
        stock: 999,
      },
    ).catch((e) => e);
    expect(error).toBeInstanceOf(NotFoundError);

    const after = await db()
      .select({ stock: products.stock })
      .from(products)
      .where(
        inArray(
          products.id,
          rows.map((r) => r.id),
        ),
      );
    expect(after.map((a) => a.stock).sort()).toEqual(
      rows.map((r) => r.stock).sort(),
    );
  });

  it("rechaza una categoría inexistente sin cambiar nada", async () => {
    const [row] = await someProducts(1);
    await expect(
      bulkUpdateProducts(db(), [row.id], { categoryId: 999, stock: 1 }),
    ).rejects.toMatchObject({ code: "CATEGORY_NOT_FOUND" });
    const [after] = await db()
      .select()
      .from(products)
      .where(eq(products.id, row.id));
    expect(after.stock).toBe(row.stock);
  });
});

describe("cambio de estado de pedidos en lote", () => {
  it("cambia solo los que tienen otro estado y registra eventos BULK", async () => {
    const board = await getKanbanBoard(db());
    const pending = board.PENDING.items.slice(0, 2);
    const alreadyShipped = board.SHIPPED.items[0];
    const ids = [...pending.map((c) => c.id), alreadyShipped.id];

    const result = await bulkUpdateOrderStatus(db(), ids, "SHIPPED", null);
    expect(result).toEqual({ updated: 2, unchanged: 1 });

    const rows = await db()
      .select()
      .from(orders)
      .where(inArray(orders.id, ids));
    expect(rows.every((r) => r.status === "SHIPPED")).toBe(true);
    const moved = rows.find((r) => r.id === pending[0].id)!;
    expect(moved.version).toBe(pending[0].version + 1);

    const events = await db()
      .select()
      .from(orderStatusEvents)
      .where(inArray(orderStatusEvents.orderId, ids));
    const bulk = events.filter((e) => e.source === "BULK");
    expect(bulk).toHaveLength(2);
    expect(
      bulk.every((e) => e.fromStatus === "PENDING" && e.toStatus === "SHIPPED"),
    ).toBe(true);
  });

  it("cancelar en lote saca los pedidos de las ventas", async () => {
    const summary = async () =>
      (await getSalesAnalytics(db(), { page: 1, limit: 1 })).summary;
    const before = await summary();
    const board = await getKanbanBoard(db());
    const ids = board.DELIVERED.items.slice(0, 3).map((c) => c.id);

    await bulkUpdateOrderStatus(db(), ids, "CANCELLED", null);
    expect((await summary()).orders).toBe(before.orders - 3);
  });

  it("es todo o nada: si un pedido no existe, no cambia ninguno", async () => {
    const board = await getKanbanBoard(db());
    const card = board.PROCESSING.items[0];
    await expect(
      bulkUpdateOrderStatus(db(), [card.id, MISSING], "DELIVERED", null),
    ).rejects.toBeInstanceOf(NotFoundError);
    const [row] = await db()
      .select()
      .from(orders)
      .where(eq(orders.id, card.id));
    expect(row.status).toBe("PROCESSING");
  });
});
