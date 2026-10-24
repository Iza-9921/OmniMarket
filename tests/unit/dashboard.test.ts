import { describe, expect, it } from "vitest";
import {
  dashboardQuerySchema,
  daysBetween,
  fillDays,
  resolveRange,
  shiftDay,
} from "@/lib/dashboard";
import { formatCompactCurrency, formatShortDay } from "@/lib/format";

describe("rango del dashboard", () => {
  it("por defecto son los últimos 30 días, incluido hoy", () => {
    const range = resolveRange(dashboardQuerySchema.parse({}), "2026-10-24");
    expect(range).toEqual({ from: "2026-09-25", to: "2026-10-24" });
    expect(daysBetween(range.from, range.to)).toBe(30);
  });

  it("calcula cada rango predefinido terminando hoy", () => {
    for (const [range, days] of [
      ["7d", 7],
      ["90d", 90],
      ["180d", 180],
    ] as const) {
      const r = resolveRange(
        dashboardQuerySchema.parse({ range }),
        "2026-03-01",
      );
      expect(r.to).toBe("2026-03-01");
      expect(daysBetween(r.from, r.to)).toBe(days);
    }
  });

  it("respeta un rango personalizado válido y cruza meses y años", () => {
    const query = dashboardQuerySchema.parse({
      range: "custom",
      from: "2025-12-30",
      to: "2026-01-02",
    });
    expect(resolveRange(query, "2026-10-24")).toEqual({
      from: "2025-12-30",
      to: "2026-01-02",
    });
    expect(shiftDay("2025-12-31", 1)).toBe("2026-01-01");
  });

  it("rechaza rangos personalizados incompletos, invertidos o de más de un año", () => {
    for (const query of [
      { range: "custom", from: "2026-10-01" },
      { range: "custom", from: "2026-10-10", to: "2026-10-01" },
      { range: "custom", from: "2024-01-01", to: "2026-01-01" },
      { range: "365d" },
    ]) {
      expect(
        dashboardQuerySchema.safeParse(query).success,
        JSON.stringify(query),
      ).toBe(false);
    }
  });
});

describe("fillDays", () => {
  it("rellena con ceros los días sin ventas y conserva los que sí tienen", () => {
    const rows = [{ date: "2026-10-02", revenueCents: 500 }];
    expect(
      fillDays(rows, "2026-10-01", "2026-10-03", (date) => ({
        date,
        revenueCents: 0,
      })),
    ).toEqual([
      { date: "2026-10-01", revenueCents: 0 },
      { date: "2026-10-02", revenueCents: 500 },
      { date: "2026-10-03", revenueCents: 0 },
    ]);
  });
});

describe("formatos de las gráficas", () => {
  it("compacta importes de forma legible", () => {
    expect(formatCompactCurrency(950)).toBe("$950");
    expect(formatCompactCurrency(12_345)).toBe("$12.3 mil");
    expect(formatCompactCurrency(120_000)).toBe("$120 mil");
    expect(formatCompactCurrency(1_234_567)).toBe("$1.2 M");
    expect(formatCompactCurrency(-2_500)).toBe("-$2.5 mil");
  });

  it("da el día corto sin desfase de zona horaria", () => {
    expect(formatShortDay("2026-10-24")).toBe("24 oct");
    expect(formatShortDay("2026-01-01")).toBe("1 ene");
  });
});
