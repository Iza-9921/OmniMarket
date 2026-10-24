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
  // Drizzle expande un arreglo como lista de parámetros, no como arreglo de
  // PostgreSQL: se arma la lista `('2026-10-24'::date, …)` de forma explícita.
  const dayList = days
    ? sql.join(
        days.map((day) => sql`${day}::date`),
        sql`, `,
      )
    : undefined;
  const dayFilter = dayList ? sql`${businessDay} in (${dayList})` : sql`true`;

  await db.execute(
    dayList
      ? sql`delete from daily_sales where date in (${dayList})`
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
