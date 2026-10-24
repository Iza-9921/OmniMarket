import { describe, expect, it } from "vitest";
import {
  centsToAmount,
  formatCurrency,
  formatDate,
  toBusinessDay,
} from "@/lib/format";

describe("formatCurrency", () => {
  it("formatea centavos como pesos mexicanos", () => {
    expect(formatCurrency(123_456)).toBe("$1,234.56");
    expect(formatCurrency(100_000_000)).toBe("$1,000,000.00");
  });

  it("formatea cero y cantidades negativas", () => {
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(-5_000)).toBe("-$50.00");
  });
});

describe("centsToAmount", () => {
  it("convierte centavos a una cantidad decimal exacta", () => {
    expect(centsToAmount(123_456)).toBe(1234.56);
    expect(centsToAmount(5)).toBe(0.05);
    expect(centsToAmount(0)).toBe(0);
  });
});

describe("fechas en la zona horaria del negocio", () => {
  it("usa America/Mexico_City aunque la hora UTC ya sea del día siguiente", () => {
    // 03:00 UTC del 6 de octubre = 21:00 del 5 de octubre en CDMX.
    const lateEvening = new Date("2026-10-06T03:00:00Z");
    expect(toBusinessDay(lateEvening)).toBe("2026-10-05");
    expect(formatDate(lateEvening)).toBe("05 oct 2026");
  });

  it("acepta fechas en texto ISO", () => {
    expect(formatDate("2026-10-05T18:00:00Z")).toBe("05 oct 2026");
  });
});
