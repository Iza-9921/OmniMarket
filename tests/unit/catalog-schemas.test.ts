import { describe, expect, it } from "vitest";
import { orderInputSchema, productInputSchema } from "@/lib/schemas/catalog";

const validProduct = {
  sku: "ele-9001",
  name: "  Audífonos Pro  ",
  categoryId: "1",
  price: "199.9",
  cost: "80",
  stock: "5",
  status: "ACTIVE",
};

const issuesOf = (result: { error?: { issues: { path: PropertyKey[] }[] } }) =>
  result.error?.issues.map((i) => i.path.join(".")) ?? [];

describe("productInputSchema", () => {
  it("normaliza el SKU, recorta el nombre y convierte importes a centavos", () => {
    expect(productInputSchema.parse(validProduct)).toEqual({
      sku: "ELE-9001",
      name: "Audífonos Pro",
      description: "",
      categoryId: 1,
      price: 19990,
      cost: 8000,
      stock: 5,
      status: "ACTIVE",
    });
  });

  it("rechaza precio negativo, más de 2 decimales, stock decimal y SKU inválido", () => {
    const result = productInputSchema.safeParse({
      ...validProduct,
      sku: "a!",
      price: "-5",
      cost: "1.234",
      stock: "2.5",
    });
    expect(issuesOf(result).sort()).toEqual(["cost", "price", "sku", "stock"]);
  });

  it("exige categoría y nombre", () => {
    const result = productInputSchema.safeParse({
      ...validProduct,
      categoryId: "",
      name: " ",
    });
    expect(issuesOf(result).sort()).toEqual(["categoryId", "name"]);
  });
});

describe("orderInputSchema", () => {
  const productId = "8f14e45f-ceea-467a-9575-2a2b9e5d6c1f";

  it("acepta un pedido válido y pone PENDING por defecto", () => {
    expect(
      orderInputSchema.parse({
        customerId: "3",
        items: [{ productId, quantity: "2" }],
      }),
    ).toEqual({
      customerId: 3,
      status: "PENDING",
      items: [{ productId, quantity: 2 }],
    });
  });

  it("exige al menos una línea y cantidades de 1 a 999", () => {
    expect(
      issuesOf(orderInputSchema.safeParse({ customerId: 1, items: [] })),
    ).toEqual(["items"]);
    expect(
      issuesOf(
        orderInputSchema.safeParse({
          customerId: 1,
          items: [{ productId, quantity: 0 }],
        }),
      ),
    ).toEqual(["items.0.quantity"]);
  });

  it("no permite repetir un producto en el mismo pedido", () => {
    const result = orderInputSchema.safeParse({
      customerId: 1,
      items: [
        { productId, quantity: 1 },
        { productId, quantity: 2 },
      ],
    });
    expect(result.error?.issues[0].message).toBe(
      "Cada producto solo puede aparecer una vez",
    );
  });

  it("ignora los totales que mande el cliente (los calcula el servidor)", () => {
    const parsed = orderInputSchema.parse({
      customerId: 1,
      totalCents: 1,
      items: [{ productId, quantity: 1 }],
    });
    expect(parsed).not.toHaveProperty("totalCents");
  });
});
