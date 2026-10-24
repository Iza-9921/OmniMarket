import { sql } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import {
  categories,
  customers,
  orderItems,
  orderStatusEvents,
  orders,
  products,
} from "@/server/db/schema";
import { generateSeedData, SEED_NAME } from "@/server/db/seed-data";
import { refreshDailySales } from "./daily-sales";

// Identificador arbitrario del candado: evita dos resets simultáneos.
const RESET_LOCK_ID = 7_340_001;
const BATCH_SIZE = 500;

async function insertInBatches<T>(
  rows: T[],
  insert: (batch: T[]) => Promise<unknown>,
) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await insert(rows.slice(i, i + BATCH_SIZE));
  }
}

/**
 * Restablece las tablas de negocio al conjunto de prueba conocido, en una sola
 * transacción: si algo falla, la base de datos queda como estaba.
 * No toca tablas ajenas al negocio (p. ej. los usuarios de autenticación).
 */
export async function resetDatabase(db: Database, now = new Date()) {
  const started = performance.now();
  const data = generateSeedData(now);

  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${RESET_LOCK_ID})`);
    await tx.execute(sql`
      truncate table order_status_events, order_items, orders, customers,
        products, categories, daily_sales
      restart identity cascade
    `);

    await tx.insert(categories).values(data.categories);
    await insertInBatches(data.products, (b) => tx.insert(products).values(b));
    await tx.insert(customers).values(data.customers);
    await insertInBatches(data.orders, (b) => tx.insert(orders).values(b));
    await insertInBatches(data.orderItems, (b) =>
      tx.insert(orderItems).values(b),
    );
    await insertInBatches(data.statusEvents, (b) =>
      tx.insert(orderStatusEvents).values(b),
    );

    // Las secuencias deben seguir a los ids explícitos del seed.
    await tx.execute(
      sql`select setval('categories_id_seq', (select max(id) from categories))`,
    );
    await tx.execute(
      sql`select setval('customers_id_seq', (select max(id) from customers))`,
    );

    await refreshDailySales(tx);
  });

  return {
    seed: SEED_NAME,
    counts: {
      categories: data.categories.length,
      products: data.products.length,
      customers: data.customers.length,
      orders: data.orders.length,
      orderItems: data.orderItems.length,
    },
    durationMs: Math.round(performance.now() - started),
  };
}
