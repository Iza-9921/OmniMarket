import { desc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ORDER_STATUSES } from "@/lib/domain";
import { KANBAN_COLUMN_LIMIT } from "@/lib/kanban";
import { closeDb, getDb } from "@/server/db/client";
import { orderStatusEvents } from "@/server/db/schema";
import { getSalesAnalytics } from "@/server/services/analytics";
import { getOrderKanbanStatus } from "@/server/services/kanban";
import { getKanbanBoard, updateOrderStatus } from "@/server/services/orders";
import { resetDatabase } from "@/server/services/reset";

const db = () => getDb();

beforeAll(async () => {
  await resetDatabase(db());
});

afterAll(async () => {
  await closeDb();
});

describe("tablero Kanban", () => {
  it("trae todas las columnas con su total y como máximo 30 tarjetas recientes", async () => {
    const board = await getKanbanBoard(db());
    expect(Object.keys(board)).toEqual([...ORDER_STATUSES]);
    expect(board.PENDING.total).toBe(13);
    expect(board.DELIVERED.total).toBe(1328);
    expect(board.DELIVERED.items).toHaveLength(KANBAN_COLUMN_LIMIT);

    const dates = board.DELIVERED.items.map((c) => c.updatedAt);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(board.PENDING.items.map((c) => c.code)).toContain("ORD-0001");
  });

  it("mueve un pedido, registra el evento KANBAN y lo refleja kanban-status", async () => {
    const board = await getKanbanBoard(db());
    const card = board.PENDING.items.find((c) => c.code === "ORD-0001")!;

    const saved = await updateOrderStatus(
      db(),
      card.id,
      "PROCESSING",
      card.version,
      null,
    );
    expect(saved).toMatchObject({
      code: "ORD-0001",
      status: "PROCESSING",
      version: card.version + 1,
    });

    const [event] = await db()
      .select()
      .from(orderStatusEvents)
      .where(eq(orderStatusEvents.orderId, card.id))
      .orderBy(desc(orderStatusEvents.id))
      .limit(1);
    expect(event).toMatchObject({
      fromStatus: "PENDING",
      toStatus: "PROCESSING",
      source: "KANBAN",
    });

    const status = await getOrderKanbanStatus(db(), "ORD-0001");
    expect(status).toMatchObject({
      status: "PROCESSING",
      lastMove: { from: "PENDING", to: "PROCESSING", source: "KANBAN" },
    });

    const after = await getKanbanBoard(db());
    expect(after.PROCESSING.items[0].code).toBe("ORD-0001");
    expect(after.PENDING.total).toBe(12);
  });

  it("rechaza un movimiento con una versión antigua (otro usuario lo cambió)", async () => {
    const status = await getOrderKanbanStatus(db(), "ORD-0002");
    const board = await getKanbanBoard(db());
    const card = board.PENDING.items.find((c) => c.code === "ORD-0002")!;
    await updateOrderStatus(db(), card.id, "SHIPPED", card.version, null);

    await expect(
      updateOrderStatus(db(), card.id, "DELIVERED", status!.version, null),
    ).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
    expect((await getOrderKanbanStatus(db(), "ORD-0002"))!.status).toBe(
      "SHIPPED",
    );
  });

  it("cancelar un pedido lo saca de las ventas y reactivarlo lo devuelve", async () => {
    const summary = async () =>
      (await getSalesAnalytics(db(), { page: 1, limit: 1 })).summary;
    const board = await getKanbanBoard(db());
    const card = board.DELIVERED.items[0];
    const before = await summary();

    const cancelled = await updateOrderStatus(
      db(),
      card.id,
      "CANCELLED",
      card.version,
      null,
    );
    expect((await summary()).orders).toBe(before.orders - 1);

    await updateOrderStatus(
      db(),
      card.id,
      "DELIVERED",
      cancelled.version,
      null,
    );
    expect(await summary()).toEqual(before);
  });

  it("mover a la misma columna no cambia nada", async () => {
    const board = await getKanbanBoard(db());
    const card = board.SHIPPED.items[0];
    const saved = await updateOrderStatus(
      db(),
      card.id,
      "SHIPPED",
      card.version,
      null,
    );
    expect(saved.version).toBe(card.version);
  });
});
