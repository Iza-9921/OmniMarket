import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { productInputSchema, orderInputSchema } from "@/lib/schemas/catalog";
import {
  orderListQuerySchema,
  productListQuerySchema,
} from "@/lib/schemas/lists";
import { closeDb, getDb } from "@/server/db/client";
import { orderStatusEvents, products } from "@/server/db/schema";
import { ConflictError, DomainValidationError } from "@/server/errors";
import { getSalesAnalytics } from "@/server/services/analytics";
import {
  createOrder,
  deleteOrder,
  getOrder,
  listOrders,
  updateOrder,
} from "@/server/services/orders";
import {
  createProduct,
  deleteProduct,
  isSkuAvailable,
  listProducts,
  updateProduct,
} from "@/server/services/products";
import { resetDatabase } from "@/server/services/reset";

const db = () => getDb();
const productQuery = (q: Record<string, unknown> = {}) =>
  productListQuerySchema.parse(q);
const orderQuery = (q: Record<string, unknown> = {}) =>
  orderListQuerySchema.parse(q);
const newProduct = (overrides: Record<string, unknown> = {}) =>
  productInputSchema.parse({
    sku: `TST-${Math.random().toString(36).slice(2, 8)}`,
    name: "Producto de prueba",
    categoryId: 1,
    price: "250.00",
    cost: "100.00",
    stock: 5,
    status: "ACTIVE",
    ...overrides,
  });

beforeAll(async () => {
  await resetDatabase(db());
});

afterAll(async () => {
  await closeDb();
});

describe("listado de productos", () => {
  it("pagina en el servidor con el total correcto", async () => {
    const page1 = await listProducts(db(), productQuery({ limit: 50 }));
    const page3 = await listProducts(
      db(),
      productQuery({ limit: 50, page: 3 }),
    );
    expect(page1.data).toHaveLength(50);
    expect(page1.pagination).toMatchObject({ total: 120, totalPages: 3 });
    expect(page3.data).toHaveLength(20);
  });

  it("filtra por categoría, estado y stock", async () => {
    const byCategory = await listProducts(
      db(),
      productQuery({ categoryId: 2, limit: 100 }),
    );
    expect(byCategory.data.every((p) => p.categoryId === 2)).toBe(true);
    expect(byCategory.pagination.total).toBe(15);

    const drafts = await listProducts(db(), productQuery({ status: "DRAFT" }));
    expect(drafts.pagination.total).toBe(6);

    const out = await listProducts(
      db(),
      productQuery({ stock: "out", limit: 100 }),
    );
    expect(out.data.every((p) => p.stock === 0)).toBe(true);
    const low = await listProducts(
      db(),
      productQuery({ stock: "low", limit: 100 }),
    );
    expect(low.data.every((p) => p.stock >= 1 && p.stock <= 10)).toBe(true);
  });

  it("busca por nombre o SKU sin distinguir mayúsculas y escapa comodines", async () => {
    const bySku = await listProducts(db(), productQuery({ q: "ele-0001" }));
    expect(bySku.data.map((p) => p.sku)).toEqual(["ELE-0001"]);
    const wildcard = await listProducts(db(), productQuery({ q: "%" }));
    expect(wildcard.pagination.total).toBe(0);
  });

  it("ordena por precio ascendente", async () => {
    const { data } = await listProducts(
      db(),
      productQuery({ sort: "price", dir: "asc", limit: 10 }),
    );
    const prices = data.map((p) => p.priceCents);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });
});

describe("disponibilidad de SKU y productos en uso", () => {
  it("informa si un SKU está libre, sin contar el producto que se edita", async () => {
    const { data } = await listProducts(db(), productQuery({ q: "ELE-0001" }));
    expect(await isSkuAvailable(db(), "ele-0001")).toBe(false);
    expect(await isSkuAvailable(db(), "ELE-0001", data[0].id)).toBe(true);
    expect(await isSkuAvailable(db(), "NO-EXISTE-123")).toBe(true);
  });

  it("marca como en uso solo los productos que aparecen en pedidos", async () => {
    const { data } = await listProducts(db(), productQuery({ limit: 100 }));
    const archived = data.filter((p) => p.status === "ARCHIVED");
    expect(archived.length).toBeGreaterThan(0);
    expect(archived.every((p) => p.inUse === false)).toBe(true);
    expect(data.some((p) => p.inUse === true)).toBe(true);
  });
});

describe("CRUD de productos", () => {
  it("crea, edita y elimina un producto", async () => {
    const created = await createProduct(
      db(),
      newProduct({ sku: "TST-CRUD-1" }),
    );
    expect(created).toMatchObject({
      sku: "TST-CRUD-1",
      priceCents: 25000,
      categoryName: "Electrónica",
    });

    const updated = await updateProduct(
      db(),
      created.id,
      newProduct({ sku: "TST-CRUD-1", price: "199.99", stock: 0 }),
    );
    expect(updated).toMatchObject({ priceCents: 19999, stock: 0 });

    await deleteProduct(db(), created.id);
    expect(
      (await db().select().from(products).where(eq(products.id, created.id)))
        .length,
    ).toBe(0);
  });

  it("rechaza un SKU repetido con un conflicto", async () => {
    await expect(
      createProduct(db(), newProduct({ sku: "ELE-0001" })),
    ).rejects.toMatchObject({
      code: "SKU_TAKEN",
    });
  });

  it("no elimina un producto que aparece en pedidos", async () => {
    const [{ productId }] = (
      await db().execute<{ productId: string }>(
        sql`select product_id as "productId" from order_items limit 1`,
      )
    ).rows;
    const error = await deleteProduct(db(), productId).catch((e) => e);
    expect(error).toBeInstanceOf(ConflictError);
    expect(error.code).toBe("PRODUCT_IN_USE");
  });
});

describe("pedidos", () => {
  async function activeProducts(n: number) {
    const { data } = await listProducts(
      db(),
      productQuery({ status: "ACTIVE", limit: n }),
    );
    return data;
  }

  it("lista con filtros por estado, cliente y búsqueda por código", async () => {
    const pending = await listOrders(
      db(),
      orderQuery({ status: "PENDING", limit: 100 }),
    );
    expect(pending.data.every((o) => o.status === "PENDING")).toBe(true);

    const byCode = await listOrders(db(), orderQuery({ q: "ORD-0001" }));
    expect(byCode.data[0].code).toBe("ORD-0001");

    const customer = byCode.data[0].customerId;
    const byCustomer = await listOrders(
      db(),
      orderQuery({ customerId: customer, limit: 100 }),
    );
    expect(byCustomer.data.every((o) => o.customerId === customer)).toBe(true);
  });

  it("calcula los totales en el servidor con los precios de la base de datos", async () => {
    const [a, b] = await activeProducts(2);
    const order = await createOrder(
      db(),
      orderInputSchema.parse({
        customerId: 1,
        items: [
          { productId: a.id, quantity: 2 },
          { productId: b.id, quantity: 1 },
        ],
      }),
      null,
    );
    const subtotal = a.priceCents * 2 + b.priceCents;
    expect(order).toMatchObject({
      code: "ORD-1501",
      status: "PENDING",
      subtotalCents: subtotal,
      taxCents: Math.round(subtotal * 0.16),
      totalCents: subtotal + Math.round(subtotal * 0.16),
    });
    expect(order.items).toHaveLength(2);
  });

  it("actualiza la analítica del día al crear y eliminar un pedido", async () => {
    const before = (await getSalesAnalytics(db(), { page: 1, limit: 1 }))
      .summary.orders;
    const [p] = await activeProducts(1);
    const order = await createOrder(
      db(),
      orderInputSchema.parse({
        customerId: 2,
        items: [{ productId: p.id, quantity: 1 }],
      }),
      null,
    );
    expect(
      (await getSalesAnalytics(db(), { page: 1, limit: 1 })).summary.orders,
    ).toBe(before + 1);

    await deleteOrder(db(), order.id);
    expect(
      (await getSalesAnalytics(db(), { page: 1, limit: 1 })).summary.orders,
    ).toBe(before);
  });

  it("al cambiar el estado registra el evento, sube la versión y detecta conflictos", async () => {
    const [p] = await activeProducts(1);
    const order = await createOrder(
      db(),
      orderInputSchema.parse({
        customerId: 3,
        items: [{ productId: p.id, quantity: 1 }],
      }),
      null,
    );

    const input = orderInputSchema.parse({
      customerId: 3,
      status: "PROCESSING",
      version: order.version,
      items: [{ productId: p.id, quantity: 3 }],
    });
    const updated = await updateOrder(
      db(),
      order.id,
      input,
      "usuario-inexistente",
    );
    expect(updated).toMatchObject({
      status: "PROCESSING",
      version: order.version + 1,
    });
    expect(updated.items[0].quantity).toBe(3);

    const events = await db()
      .select()
      .from(orderStatusEvents)
      .where(eq(orderStatusEvents.orderId, order.id))
      .orderBy(orderStatusEvents.id);
    expect(events.map((e) => [e.fromStatus, e.toStatus])).toEqual([
      [null, "PENDING"],
      ["PENDING", "PROCESSING"],
    ]);
    expect(events[1].actorUserId).toBeNull();

    // La misma versión antigua otra vez: otro usuario ya la cambió.
    await expect(
      updateOrder(db(), order.id, input, null),
    ).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
    expect((await getOrder(db(), order.id)).status).toBe("PROCESSING");
  });

  it("no acepta productos archivados en un pedido nuevo", async () => {
    const { data } = await listProducts(
      db(),
      productQuery({ status: "ARCHIVED", limit: 1 }),
    );
    const error = await createOrder(
      db(),
      orderInputSchema.parse({
        customerId: 1,
        items: [{ productId: data[0].id, quantity: 1 }],
      }),
      null,
    ).catch((e) => e);
    expect(error).toBeInstanceOf(DomainValidationError);
  });
});
