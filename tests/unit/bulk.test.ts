import { describe, expect, it } from "vitest";
import {
  adjustPrice,
  applyOrderStatus,
  applyProductChanges,
  MAX_BULK_ROWS,
  orderBulkSchema,
  productBulkSchema,
} from "@/lib/bulk";

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("productBulkSchema", () => {
  it("acepta cambios válidos y convierte los textos del formulario", () => {
    expect(
      productBulkSchema.parse({
        ids: [uuid(1)],
        changes: { priceAdjustPct: "10.15", stock: "5" },
      }),
    ).toEqual({ ids: [uuid(1)], changes: { priceAdjustPct: 10.15, stock: 5 } });
  });

  it(`limita a ${MAX_BULK_ROWS} filas, sin repetidas ni vacío`, () => {
    const many = Array.from({ length: MAX_BULK_ROWS + 1 }, (_, i) => uuid(i));
    const changes = { status: "DRAFT" };
    expect(productBulkSchema.safeParse({ ids: many, changes }).success).toBe(
      false,
    );
    expect(productBulkSchema.safeParse({ ids: [], changes }).success).toBe(
      false,
    );
    expect(
      productBulkSchema.safeParse({ ids: [uuid(1), uuid(1)], changes }).success,
    ).toBe(false);
  });

  it("exige al menos un cambio y valida rangos", () => {
    const ids = [uuid(1)];
    for (const changes of [
      {},
      { priceAdjustPct: "-91" },
      { priceAdjustPct: "1.234" },
      { stock: "-1" },
      { stock: "2.5" },
    ]) {
      expect(
        productBulkSchema.safeParse({ ids, changes }).success,
        JSON.stringify(changes),
      ).toBe(false);
    }
  });
});

describe("orderBulkSchema", () => {
  it("exige un estado válido", () => {
    expect(
      orderBulkSchema.safeParse({ ids: [uuid(1)], status: "SHIPPED" }).success,
    ).toBe(true);
    expect(
      orderBulkSchema.safeParse({ ids: [uuid(1)], status: "PERDIDO" }).success,
    ).toBe(false);
  });
});

describe("adjustPrice", () => {
  it("redondea al centavo y nunca baja de cero", () => {
    expect(adjustPrice(19_999, 10)).toBe(21_999);
    expect(adjustPrice(19_999, -10)).toBe(17_999);
    expect(adjustPrice(1_000, 10.15)).toBe(1_102);
    expect(adjustPrice(100, -90)).toBe(10);
  });
});

describe("aplicación optimista", () => {
  const rows = [
    {
      id: "a",
      status: "ACTIVE" as const,
      categoryId: 1,
      categoryName: "Electrónica",
      priceCents: 10_000,
      stock: 5,
    },
    {
      id: "b",
      status: "ACTIVE" as const,
      categoryId: 1,
      categoryName: "Electrónica",
      priceCents: 20_000,
      stock: 9,
    },
  ];

  it("solo cambia las filas seleccionadas", () => {
    const next = applyProductChanges(
      rows,
      new Set(["a"]),
      {
        status: "DRAFT",
        categoryId: 3,
        priceAdjustPct: 50,
      },
      "Cocina",
    );
    expect(next[0]).toMatchObject({
      status: "DRAFT",
      categoryId: 3,
      categoryName: "Cocina",
      priceCents: 15_000,
      stock: 5,
    });
    expect(next[1]).toBe(rows[1]);
  });

  it("cambia el estado de los pedidos seleccionados", () => {
    const orders = [
      { id: "x", status: "PENDING" as const },
      { id: "y", status: "PENDING" as const },
    ];
    expect(applyOrderStatus(orders, new Set(["y"]), "SHIPPED")).toEqual([
      { id: "x", status: "PENDING" },
      { id: "y", status: "SHIPPED" },
    ]);
  });
});
