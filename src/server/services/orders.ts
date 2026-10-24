import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  ORDER_STATUSES,
  TAX_RATE,
  TIME_ZONE,
  type OrderStatus,
} from "@/lib/domain";
import { toBusinessDay } from "@/lib/format";
import {
  KANBAN_COLUMN_LIMIT,
  type KanbanBoard,
  type KanbanCard,
} from "@/lib/kanban";
import { orderTotals } from "@/lib/metrics";
import type { OrderData } from "@/lib/schemas/catalog";
import type { OrderListQuery } from "@/lib/schemas/lists";
import type { Database } from "@/server/db/client";
import {
  customers,
  orderItems,
  orderStatusEvents,
  orders,
  products,
} from "@/server/db/schema";
import {
  ConflictError,
  DomainValidationError,
  NotFoundError,
} from "@/server/errors";
import { refreshDailySales } from "./daily-sales";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

// Candado transaccional para asignar el siguiente código ORD-NNNN sin duplicados.
const ORDER_CODE_LOCK_ID = 7_340_002;

const businessDay = sql`(${orders.placedAt} at time zone ${TIME_ZONE})::date`;

/** Condiciones SQL de los filtros del listado de pedidos. */
export function orderFilters(query: OrderListQuery): SQL | undefined {
  const conditions: SQL[] = [];
  if (query.q) {
    const pattern = `%${query.q.replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push(
      or(ilike(orders.code, pattern), ilike(customers.name, pattern))!,
    );
  }
  if (query.status) conditions.push(eq(orders.status, query.status));
  if (query.customerId)
    conditions.push(eq(orders.customerId, query.customerId));
  if (query.from) conditions.push(sql`${businessDay} >= ${query.from}::date`);
  if (query.to) conditions.push(sql`${businessDay} <= ${query.to}::date`);
  return conditions.length ? and(...conditions) : undefined;
}

export async function listOrders(db: Database, query: OrderListQuery) {
  const where = orderFilters(query);

  const [{ total }] = await db
    .select({ total: count() })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(where);

  const rows = await db
    .select({
      id: orders.id,
      code: orders.code,
      status: orders.status,
      totalCents: orders.totalCents,
      customerId: orders.customerId,
      customerName: customers.name,
      itemsCount: sql<number>`(select count(*)::int from ${orderItems} where ${orderItems.orderId} = ${orders.id})`,
      placedAt: orders.placedAt,
      updatedAt: orders.updatedAt,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(where)
    .orderBy(desc(orders.placedAt), asc(orders.code))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  return {
    data: rows.map((row) => ({
      ...row,
      placedAt: row.placedAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getOrder(db: Database | Transaction, id: string) {
  const [order] = await db
    .select({
      id: orders.id,
      code: orders.code,
      status: orders.status,
      version: orders.version,
      customerId: orders.customerId,
      customerName: customers.name,
      customerEmail: customers.email,
      subtotalCents: orders.subtotalCents,
      taxCents: orders.taxCents,
      totalCents: orders.totalCents,
      costCents: orders.costCents,
      placedAt: orders.placedAt,
      updatedAt: orders.updatedAt,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(eq(orders.id, id))
    .limit(1);
  if (!order) throw new NotFoundError("ORDER_NOT_FOUND");

  const items = await db
    .select({
      productId: orderItems.productId,
      sku: products.sku,
      name: products.name,
      quantity: orderItems.quantity,
      unitPriceCents: orderItems.unitPriceCents,
    })
    .from(orderItems)
    .innerJoin(products, eq(products.id, orderItems.productId))
    .where(eq(orderItems.orderId, id))
    .orderBy(asc(orderItems.id));

  return {
    ...order,
    placedAt: order.placedAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items,
  };
}

/**
 * Calcula las líneas con los precios ACTUALES de la base de datos: el total
 * nunca se toma del cliente (RF-33). Solo admite productos activos, salvo los
 * que el pedido ya tenía (al editar no se obliga a quitarlos si se archivaron).
 */
async function priceLines(
  tx: Transaction,
  items: OrderData["items"],
  allowed: Set<string>,
) {
  const ids = items.map((item) => item.productId);
  const found = await tx
    .select({
      id: products.id,
      status: products.status,
      priceCents: products.priceCents,
      costCents: products.costCents,
    })
    .from(products)
    .where(inArray(products.id, ids));
  const byId = new Map(found.map((p) => [p.id, p]));

  return items.map((item) => {
    const product = byId.get(item.productId);
    if (!product || (product.status !== "ACTIVE" && !allowed.has(product.id))) {
      throw new DomainValidationError(
        "PRODUCT_UNAVAILABLE",
        "Uno de los productos no existe o no está activo.",
      );
    }
    return {
      productId: product.id,
      quantity: item.quantity,
      unitPriceCents: product.priceCents,
      unitCostCents: product.costCents,
    };
  });
}

/** Inserta un evento de estado; el autor queda en null si no es un usuario registrado. */
function statusEvent(
  orderId: string,
  fromStatus: OrderData["status"] | null,
  toStatus: OrderData["status"],
  actorId: string | null,
  source: "FORM" | "KANBAN" | "BULK" = "FORM",
) {
  return {
    orderId,
    fromStatus,
    toStatus,
    source,
    actorUserId: actorId
      ? sql`(select id from users where id = ${actorId})`
      : null,
  };
}

export async function createOrder(
  db: Database,
  data: OrderData,
  actorId: string | null,
) {
  const id = await db.transaction(async (tx) => {
    const lines = await priceLines(tx, data.items, new Set());
    const totals = orderTotals(lines, TAX_RATE);

    await tx.execute(sql`select pg_advisory_xact_lock(${ORDER_CODE_LOCK_ID})`);
    const [{ next }] = (
      await tx.execute<{ next: number }>(
        sql`select coalesce(max(substring(code from 5)::int), 0) + 1 as next from orders`,
      )
    ).rows;
    const code = `ORD-${String(next).padStart(4, "0")}`;

    const [order] = await tx
      .insert(orders)
      .values({
        code,
        customerId: data.customerId,
        status: data.status,
        ...totals,
        placedAt: new Date(),
      })
      .returning({ id: orders.id, placedAt: orders.placedAt });

    await tx
      .insert(orderItems)
      .values(lines.map((line) => ({ orderId: order.id, ...line })));
    await tx
      .insert(orderStatusEvents)
      .values(statusEvent(order.id, null, data.status, actorId));
    await refreshDailySales(tx, [toBusinessDay(order.placedAt)]);
    return order.id;
  });
  return getOrder(db, id);
}

export async function updateOrder(
  db: Database,
  id: string,
  data: OrderData,
  actorId: string | null,
) {
  await db.transaction(async (tx) => {
    const [current] = await tx
      .select({
        status: orders.status,
        version: orders.version,
        placedAt: orders.placedAt,
      })
      .from(orders)
      .where(eq(orders.id, id))
      .for("update");
    if (!current) throw new NotFoundError("ORDER_NOT_FOUND");
    if (data.version !== undefined && data.version !== current.version) {
      throw new ConflictError(
        "VERSION_CONFLICT",
        "Otro usuario modificó este pedido. Recarga para ver los cambios.",
      );
    }

    const existing = await tx
      .select({ productId: orderItems.productId })
      .from(orderItems)
      .where(eq(orderItems.orderId, id));
    const lines = await priceLines(
      tx,
      data.items,
      new Set(existing.map((e) => e.productId)),
    );
    const totals = orderTotals(lines, TAX_RATE);

    await tx
      .update(orders)
      .set({
        customerId: data.customerId,
        status: data.status,
        ...totals,
        version: sql`${orders.version} + 1`,
        updatedAt: sql`now()`,
      })
      .where(eq(orders.id, id));
    await tx.delete(orderItems).where(eq(orderItems.orderId, id));
    await tx
      .insert(orderItems)
      .values(lines.map((line) => ({ orderId: id, ...line })));
    if (data.status !== current.status) {
      await tx
        .insert(orderStatusEvents)
        .values(statusEvent(id, current.status, data.status, actorId));
    }
    await refreshDailySales(tx, [toBusinessDay(current.placedAt)]);
  });
  return getOrder(db, id);
}

export async function deleteOrder(db: Database, id: string) {
  await db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(orders)
      .where(eq(orders.id, id))
      .returning({ placedAt: orders.placedAt });
    if (!deleted) throw new NotFoundError("ORDER_NOT_FOUND");
    await refreshDailySales(tx, [toBusinessDay(deleted.placedAt)]);
  });
}

export async function listCustomers(db: Database) {
  return db
    .select({ id: customers.id, name: customers.name, email: customers.email })
    .from(customers)
    .orderBy(asc(customers.name));
}

type BoardRow = Omit<KanbanCard, "updatedAt"> & {
  updatedAt: Date;
  total: number;
};

/**
 * Tablero Kanban: las `limit` tarjetas más recientes de cada columna y el total
 * por columna, en una sola consulta (window functions).
 */
export async function getKanbanBoard(
  db: Database,
  limit = KANBAN_COLUMN_LIMIT,
): Promise<KanbanBoard> {
  const { rows } = await db.execute<BoardRow>(sql`
    select id, code, status, version, "customerName", "totalCents", "itemsCount",
      "updatedAt", total
    from (
      select o.id, o.code, o.status, o.version, c.name as "customerName",
        o.total_cents as "totalCents",
        (select count(*)::int from order_items i where i.order_id = o.id) as "itemsCount",
        o.updated_at as "updatedAt",
        row_number() over (partition by o.status order by o.updated_at desc, o.code) as position,
        (count(*) over (partition by o.status))::int as total
      from orders o
      join customers c on c.id = o.customer_id
    ) ranked
    where position <= ${limit}
    order by position
  `);

  const board = Object.fromEntries(
    ORDER_STATUSES.map((status) => [
      status,
      { total: 0, items: [] as KanbanCard[] },
    ]),
  ) as KanbanBoard;
  for (const { total, updatedAt, ...card } of rows) {
    board[card.status].total = total;
    board[card.status].items.push({
      ...card,
      updatedAt: new Date(updatedAt).toISOString(),
    });
  }
  return board;
}

/**
 * Cambia el estado de un pedido desde el Kanban. Con `version` aplica control
 * de concurrencia optimista: si otro usuario lo cambió antes, responde conflicto.
 */
export async function updateOrderStatus(
  db: Database,
  id: string,
  status: OrderStatus,
  version: number,
  actorId: string | null,
): Promise<KanbanCard> {
  await db.transaction(async (tx) => {
    const [current] = await tx
      .select({
        status: orders.status,
        version: orders.version,
        placedAt: orders.placedAt,
      })
      .from(orders)
      .where(eq(orders.id, id))
      .for("update");
    if (!current) throw new NotFoundError("ORDER_NOT_FOUND");
    if (current.version !== version) {
      throw new ConflictError(
        "VERSION_CONFLICT",
        "Otro usuario modificó este pedido. El tablero se actualizó.",
      );
    }
    if (current.status === status) return;

    await tx
      .update(orders)
      .set({
        status,
        version: sql`${orders.version} + 1`,
        updatedAt: sql`now()`,
      })
      .where(eq(orders.id, id));
    await tx
      .insert(orderStatusEvents)
      .values(statusEvent(id, current.status, status, actorId, "KANBAN"));
    // Cancelar o reactivar cambia las ventas del día del pedido.
    await refreshDailySales(tx, [toBusinessDay(current.placedAt)]);
  });

  const [card] = await db
    .select({
      id: orders.id,
      code: orders.code,
      status: orders.status,
      version: orders.version,
      customerName: customers.name,
      totalCents: orders.totalCents,
      itemsCount: sql<number>`(select count(*)::int from ${orderItems} where ${orderItems.orderId} = ${orders.id})`,
      updatedAt: orders.updatedAt,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(eq(orders.id, id));
  return { ...card, updatedAt: card.updatedAt.toISOString() };
}

/**
 * Cambio de estado en lote (RF-53): todo o nada. Solo cambian (y generan evento
 * BULK) los pedidos con un estado distinto; se recalculan las ventas de sus días.
 */
export async function bulkUpdateOrderStatus(
  db: Database,
  ids: string[],
  status: OrderStatus,
  actorId: string | null,
) {
  return db.transaction(async (tx) => {
    const current = await tx
      .select({
        id: orders.id,
        status: orders.status,
        placedAt: orders.placedAt,
      })
      .from(orders)
      .where(inArray(orders.id, ids))
      .for("update");
    if (current.length !== ids.length) {
      throw new NotFoundError("ORDERS_NOT_FOUND");
    }

    const changed = current.filter((order) => order.status !== status);
    if (changed.length > 0) {
      await tx
        .update(orders)
        .set({
          status,
          version: sql`${orders.version} + 1`,
          updatedAt: sql`now()`,
        })
        .where(
          inArray(
            orders.id,
            changed.map((order) => order.id),
          ),
        );
      await tx
        .insert(orderStatusEvents)
        .values(
          changed.map((order) =>
            statusEvent(order.id, order.status, status, actorId, "BULK"),
          ),
        );
      const days = [
        ...new Set(changed.map((order) => toBusinessDay(order.placedAt))),
      ];
      await refreshDailySales(tx, days);
    }
    return { updated: changed.length, unchanged: ids.length - changed.length };
  });
}
