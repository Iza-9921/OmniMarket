import { describe, expect, it } from "vitest";
import {
  avgTicket,
  grossMargin,
  grossMarginPct,
  orderTotals,
} from "@/lib/metrics";

describe("avgTicket", () => {
  it("divide los ingresos entre los pedidos y redondea al centavo", () => {
    expect(avgTicket(100_000, 4)).toBe(25_000);
    expect(avgTicket(100_000, 3)).toBe(33_333);
  });

  it("devuelve 0 cuando no hay pedidos (sin dividir entre cero)", () => {
    expect(avgTicket(0, 0)).toBe(0);
    expect(avgTicket(50_000, 0)).toBe(0);
  });
});

describe("grossMargin y grossMarginPct", () => {
  it("calcula el margen y su porcentaje con dos decimales", () => {
    expect(grossMargin(200_000, 120_000)).toBe(80_000);
    expect(grossMarginPct(200_000, 120_000)).toBe(40);
    expect(grossMarginPct(300_000, 100_000)).toBe(66.67);
  });

  it("admite margen negativo cuando el costo supera los ingresos", () => {
    expect(grossMargin(100_000, 150_000)).toBe(-50_000);
    expect(grossMarginPct(100_000, 150_000)).toBe(-50);
  });

  it("devuelve 0 % cuando no hay ingresos", () => {
    expect(grossMarginPct(0, 0)).toBe(0);
    expect(grossMarginPct(0, 10_000)).toBe(0);
  });
});

describe("orderTotals", () => {
  it("suma las líneas y aplica el IVA sobre el subtotal", () => {
    const totals = orderTotals(
      [
        { quantity: 2, unitPriceCents: 10_000, unitCostCents: 6_000 },
        { quantity: 1, unitPriceCents: 5_050, unitCostCents: 2_000 },
      ],
      0.16,
    );
    expect(totals).toEqual({
      subtotalCents: 25_050,
      taxCents: 4_008,
      totalCents: 29_058,
      costCents: 14_000,
    });
  });

  it("devuelve ceros para un pedido sin líneas", () => {
    expect(orderTotals([], 0.16)).toEqual({
      subtotalCents: 0,
      taxCents: 0,
      totalCents: 0,
      costCents: 0,
    });
  });
});
