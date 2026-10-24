import { sql } from "drizzle-orm";
import { TIME_ZONE } from "@/lib/domain";
import type { Database } from "@/server/db/client";

type Executor = Pick<Database, "execute">;

/**
 * Recalcula la tabla agregada `daily_sales` a partir de los pedidos no cancelados.
 * Con `days` solo recalcula esos días (YYYY-MM-DD); sin él, la tabla completa.
 */
export async function refreshDailySales(db: Executor, days?: string[]) {
  const businessDay = sql`(placed_at at time zone ${TIME_ZONE})::date`;

  if (days && days.length === 0) return;
  const dayFilter = days
    ? sql`${businessDay} = any(${days}::date[])`
    : sql`true`;

  await db.execute(
    days
      ? sql`delete from daily_sales where date = any(${days}::date[])`
      : sql`delete from daily_sales`,
  );
  await db.execute(sql`
    insert into daily_sales (date, orders_count, revenue_cents, cost_cents)
    select ${businessDay}, count(*), sum(subtotal_cents), sum(cost_cents)
    from orders
    where status <> 'CANCELLED' and ${dayFilter}
    group by 1
  `);
}
