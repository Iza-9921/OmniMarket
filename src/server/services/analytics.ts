import { and, count, desc, gte, lte, sum, type SQL } from "drizzle-orm";
import { CURRENCY } from "@/lib/domain";
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
