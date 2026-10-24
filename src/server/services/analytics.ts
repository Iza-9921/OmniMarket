import { and, count, desc, gte, lte, sql, sum, type SQL } from "drizzle-orm";
import { fillDays } from "@/lib/dashboard";
import { CURRENCY, TIME_ZONE } from "@/lib/domain";
import { centsToAmount } from "@/lib/format";
import { avgTicket, grossMargin, grossMarginPct } from "@/lib/metrics";
import type { AnalyticsQuery } from "@/lib/schemas/test-endpoints";
import type { Database } from "@/server/db/client";
import { dailySales } from "@/server/db/schema";

function metrics(revenueCents: number, costCents: number, orders: number) {
  return {
    orders,
    revenue: centsToAmount(revenueCents),
    cost: centsToAmount(costCents),
    avgTicket: centsToAmount(avgTicket(revenueCents, orders)),
    grossMargin: centsToAmount(grossMargin(revenueCents, costCents)),
    grossMarginPct: grossMarginPct(revenueCents, costCents),
  };
}

/**
 * Métricas de ventas: resumen del periodo y detalle diario paginado (más reciente
 * primero). Lee la tabla agregada `daily_sales`, así que cada página son ≤ 100 filas.
 */
export async function getSalesAnalytics(db: Database, query: AnalyticsQuery) {
  const conditions: SQL[] = [];
  if (query.from) conditions.push(gte(dailySales.date, query.from));
  if (query.to) conditions.push(lte(dailySales.date, query.to));
  const where = conditions.length ? and(...conditions) : undefined;

  const [totals] = await db
    .select({
      days: count(),
      orders: sum(dailySales.ordersCount).mapWith(Number),
      revenueCents: sum(dailySales.revenueCents).mapWith(Number),
      costCents: sum(dailySales.costCents).mapWith(Number),
    })
    .from(dailySales)
    .where(where);

  const rows = await db
    .select()
    .from(dailySales)
    .where(where)
    .orderBy(desc(dailySales.date))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  return {
    summary: {
      ...metrics(
        totals.revenueCents ?? 0,
        totals.costCents ?? 0,
        totals.orders ?? 0,
      ),
      currency: CURRENCY,
    },
    data: rows.map((row) => ({
      date: row.date,
      ...metrics(row.revenueCents, row.costCents, row.ordersCount),
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: totals.days,
      totalPages: Math.ceil(totals.days / query.limit),
    },
  };
}

/**
 * Datos del dashboard para un rango de días. Los KPIs vienen de
 * getSalesAnalytics, el mismo servicio de GET /api/test/analytics: para el
 * mismo rango, las cifras son idénticas. Importes de las series en centavos.
 */
export async function getDashboard(
  db: Database,
  range: { from: string; to: string },
) {
  const { summary } = await getSalesAnalytics(db, {
    page: 1,
    limit: 1,
    ...range,
  });

  const days = await db
    .select({
      date: dailySales.date,
      orders: dailySales.ordersCount,
      revenueCents: dailySales.revenueCents,
    })
    .from(dailySales)
    .where(
      and(gte(dailySales.date, range.from), lte(dailySales.date, range.to)),
    );

  const businessDay = sql`(o.placed_at at time zone ${TIME_ZONE})::date`;
  const inRange = sql`o.status <> 'CANCELLED'
    and ${businessDay} between ${range.from}::date and ${range.to}::date`;

  const { rows: byCategory } = await db.execute<{
    name: string;
    units: number;
    revenueCents: number;
  }>(sql`
    select c.name, sum(i.quantity)::int as units,
      sum(i.quantity * i.unit_price_cents)::bigint as "revenueCents"
    from order_items i
    join orders o on o.id = i.order_id
    join products p on p.id = i.product_id
    join categories c on c.id = p.category_id
    where ${inRange}
    group by c.name
    order by "revenueCents" desc, c.name
  `);

  const { rows: topProducts } = await db.execute<{
    id: string;
    sku: string;
    name: string;
    units: number;
    revenueCents: number;
  }>(sql`
    select p.id, p.sku, p.name, sum(i.quantity)::int as units,
      sum(i.quantity * i.unit_price_cents)::bigint as "revenueCents"
    from order_items i
    join orders o on o.id = i.order_id
    join products p on p.id = i.product_id
    where ${inRange}
    group by p.id, p.sku, p.name
    order by "revenueCents" desc, p.sku
    limit 5
  `);

  const toNumber = <T extends { revenueCents: number | string }>(row: T) => ({
    ...row,
    revenueCents: Number(row.revenueCents),
  });

  return {
    range,
    summary,
    daily: fillDays(days, range.from, range.to, (date) => ({
      date,
      orders: 0,
      revenueCents: 0,
    })),
    byCategory: byCategory.map(toNumber),
    topProducts: topProducts.map(toNumber),
  };
}
