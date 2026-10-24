import { count, desc, eq, max } from "drizzle-orm";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/domain";
import type { Database } from "@/server/db/client";
import { orderStatusEvents, orders } from "@/server/db/schema";

/** Estado actual de un pedido y su último movimiento. `null` si no existe. */
export async function getOrderKanbanStatus(db: Database, code: string) {
  const [order] = await db
    .select({
      id: orders.id,
      code: orders.code,
      status: orders.status,
      version: orders.version,
      updatedAt: orders.updatedAt,
    })
    .from(orders)
    .where(eq(orders.code, code))
    .limit(1);
  if (!order) return null;

  const [lastEvent] = await db
    .select({
      from: orderStatusEvents.fromStatus,
      to: orderStatusEvents.toStatus,
      source: orderStatusEvents.source,
      at: orderStatusEvents.createdAt,
    })
    .from(orderStatusEvents)
    .where(eq(orderStatusEvents.orderId, order.id))
    .orderBy(desc(orderStatusEvents.createdAt), desc(orderStatusEvents.id))
    .limit(1);

  return {
    orderId: order.code,
    status: order.status,
    version: order.version,
    updatedAt: order.updatedAt.toISOString(),
    lastMove: lastEvent
      ? { ...lastEvent, at: lastEvent.at.toISOString() }
      : null,
  };
}

/** Número de pedidos por columna del tablero. */
export async function getKanbanColumns(db: Database) {
  const rows = await db
    .select({
      status: orders.status,
      total: count(),
      updatedAt: max(orders.updatedAt),
    })
    .from(orders)
    .groupBy(orders.status);

  const columns = Object.fromEntries(
    ORDER_STATUSES.map((status) => [status, 0]),
  ) as Record<OrderStatus, number>;
  let latest: Date | null = null;
  for (const row of rows) {
    columns[row.status] = row.total;
    if (row.updatedAt && (!latest || row.updatedAt > latest))
      latest = row.updatedAt;
  }

  return {
    columns,
    total: rows.reduce((sum, row) => sum + row.total, 0),
    updatedAt: latest?.toISOString() ?? null,
  };
}
