import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  dashboardQuerySchema,
  daysBetween,
  resolveRange,
} from "@/lib/dashboard";
import { toBusinessDay } from "@/lib/format";
import { closeDb, getDb } from "@/server/db/client";
import { getDashboard, getSalesAnalytics } from "@/server/services/analytics";
import { resetDatabase } from "@/server/services/reset";

const db = () => getDb();
const today = toBusinessDay(new Date());
const range = (r: string) =>
  resolveRange(dashboardQuerySchema.parse({ range: r }), today);

beforeAll(async () => {
  await resetDatabase(db());
});

afterAll(async () => {
  await closeDb();
});

describe("dashboard", () => {
  it("los KPIs son idénticos a los de /api/test/analytics para el mismo rango", async () => {
    for (const r of ["7d", "30d", "180d"]) {
      const { from, to } = range(r);
      const dashboard = await getDashboard(db(), { from, to });
      const analytics = await getSalesAnalytics(db(), {
        page: 1,
        limit: 1,
        from,
        to,
      });
      expect(dashboard.summary, r).toEqual(analytics.summary);
    }
  });

  it("la serie diaria cubre todos los días del rango y suma los pedidos del resumen", async () => {
    const { from, to } = range("90d");
    const dashboard = await getDashboard(db(), { from, to });
    expect(dashboard.daily).toHaveLength(daysBetween(from, to));
    expect(dashboard.daily[0].date).toBe(from);
    expect(dashboard.daily.at(-1)!.date).toBe(to);
    const orders = dashboard.daily.reduce((s, d) => s + d.orders, 0);
    expect(orders).toBe(dashboard.summary.orders);
  });

  it("las ventas por categoría suman los ingresos del periodo", async () => {
    const { from, to } = range("180d");
    const dashboard = await getDashboard(db(), { from, to });
    expect(dashboard.byCategory).toHaveLength(8);
    const total = dashboard.byCategory.reduce((s, c) => s + c.revenueCents, 0);
    expect(total / 100).toBeCloseTo(dashboard.summary.revenue, 2);
    const revenues = dashboard.byCategory.map((c) => c.revenueCents);
    expect(revenues).toEqual([...revenues].sort((a, b) => b - a));
  });

  it("devuelve los 5 productos con más ingresos, de mayor a menor", async () => {
    const { from, to } = range("180d");
    const { topProducts } = await getDashboard(db(), { from, to });
    expect(topProducts).toHaveLength(5);
    const revenues = topProducts.map((p) => p.revenueCents);
    expect(revenues).toEqual([...revenues].sort((a, b) => b - a));
    expect(topProducts.every((p) => p.units > 0)).toBe(true);
  });

  it("un rango sin ventas devuelve ceros, no errores", async () => {
    const dashboard = await getDashboard(db(), {
      from: "2020-01-01",
      to: "2020-01-07",
    });
    expect(dashboard.summary.orders).toBe(0);
    expect(dashboard.daily).toHaveLength(7);
    expect(dashboard.byCategory).toEqual([]);
    expect(dashboard.topProducts).toEqual([]);
  });
});
