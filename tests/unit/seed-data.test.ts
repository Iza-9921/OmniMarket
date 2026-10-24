import { describe, expect, it } from "vitest";
import { TAX_RATE } from "@/lib/domain";
import { toBusinessDay } from "@/lib/format";
import {
  ANCHOR_ORDER_STATUSES,
  generateSeedData,
  SEED_COUNTS,
  SEED_DAYS,
} from "@/server/db/seed-data";

const NOW = new Date("2026-10-24T18:30:00Z");

// Lo que debe ser idéntico en cualquier reset: todo menos las fechas.
function stableView(now: Date) {
  const data = generateSeedData(now);
  return {
    products: data.products,
    customers: data.customers,
    orders: data.orders.map((order) => ({
      ...order,
      placedAt: undefined,
      updatedAt: undefined,
    })),
    orderItems: data.orderItems,
  };
}

describe("generateSeedData", () => {
  it("genera las cantidades del conjunto omnimarket-v1", () => {
    const data = generateSeedData(NOW);
    expect(data.categories).toHaveLength(8);
    expect(data.products).toHaveLength(SEED_COUNTS.products);
    expect(data.customers).toHaveLength(SEED_COUNTS.customers);
    expect(data.orders).toHaveLength(SEED_COUNTS.orders);
  });

  it("es determinista: dos ejecuciones producen exactamente los mismos datos", () => {
    expect(generateSeedData(NOW)).toEqual(generateSeedData(NOW));
  });

  it("los importes, códigos y estados no dependen del día ni la hora del reset", () => {
    const early = new Date("2026-03-02T07:05:00Z"); // 01:05 en CDMX
    const late = new Date("2026-10-24T05:59:00Z"); // 23:59 en CDMX
    expect(stableView(early)).toEqual(stableView(late));
  });

  it("asigna los estados fijos a los pedidos ancla ORD-0001…ORD-0010", () => {
    const anchors = generateSeedData(NOW).orders.slice(
      0,
      ANCHOR_ORDER_STATUSES.length,
    );
    expect(anchors.map((o) => o.code)).toEqual(
      Array.from(
        { length: 10 },
        (_, i) => `ORD-${String(i + 1).padStart(4, "0")}`,
      ),
    );
    expect(anchors.map((o) => o.status)).toEqual(ANCHOR_ORDER_STATUSES);
  });

  it("los totales de cada pedido coinciden con sus líneas y el IVA", () => {
    const data = generateSeedData(NOW);
    const linesByOrder = Map.groupBy(data.orderItems, (line) => line.orderId);
    for (const order of data.orders) {
      const lines = linesByOrder.get(order.id) ?? [];
      expect(lines.length).toBeGreaterThan(0);
      const subtotal = lines.reduce(
        (s, l) => s + l.quantity * l.unitPriceCents,
        0,
      );
      expect(order.subtotalCents).toBe(subtotal);
      expect(order.taxCents).toBe(Math.round(subtotal * TAX_RATE));
      expect(order.totalCents).toBe(order.subtotalCents + order.taxCents);
    }
  });

  it("reparte los pedidos en los últimos 180 días y nunca en el futuro", () => {
    const data = generateSeedData(NOW);
    const days = new Set(data.orders.map((o) => toBusinessDay(o.placedAt)));
    expect(days.size).toBeLessThanOrEqual(SEED_DAYS);
    for (const order of data.orders) {
      expect(order.placedAt.getTime()).toBeLessThanOrEqual(NOW.getTime());
      expect(order.updatedAt.getTime()).toBeGreaterThanOrEqual(
        order.placedAt.getTime(),
      );
    }
  });

  it("solo usa productos activos en los pedidos y SKU/correos únicos", () => {
    const data = generateSeedData(NOW);
    const active = new Set(
      data.products.filter((p) => p.status === "ACTIVE").map((p) => p.id),
    );
    expect(data.orderItems.every((line) => active.has(line.productId))).toBe(
      true,
    );
    expect(new Set(data.products.map((p) => p.sku)).size).toBe(
      data.products.length,
    );
    expect(new Set(data.customers.map((c) => c.email)).size).toBe(
      data.customers.length,
    );
  });
});
