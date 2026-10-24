import {
  and,
  asc,
  between,
  count,
  desc,
  eq,
  gt,
  ilike,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { ProductData } from "@/lib/schemas/catalog";
import { LOW_STOCK_MAX, type ProductListQuery } from "@/lib/schemas/lists";
import type { Database } from "@/server/db/client";
import { categories, products } from "@/server/db/schema";
import {
  ConflictError,
  NotFoundError,
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
  pgErrorCode,
} from "@/server/errors";

const productColumns = {
  id: products.id,
  sku: products.sku,
  name: products.name,
  description: products.description,
  categoryId: products.categoryId,
  categoryName: categories.name,
  priceCents: products.priceCents,
  costCents: products.costCents,
  stock: products.stock,
  status: products.status,
  updatedAt: products.updatedAt,
  // En uso = aparece en algún pedido: no se puede eliminar, solo archivar.
  inUse: sql<boolean>`exists (select 1 from order_items where order_items.product_id = ${products.id})`,
};

/** Condiciones SQL de los filtros del listado de productos. */
export function productFilters(query: ProductListQuery): SQL | undefined {
  const conditions: SQL[] = [];
  if (query.q) {
    const pattern = `%${query.q.replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push(
      or(ilike(products.name, pattern), ilike(products.sku, pattern))!,
    );
  }
  if (query.categoryId)
    conditions.push(eq(products.categoryId, query.categoryId));
  if (query.status) conditions.push(eq(products.status, query.status));
  if (query.stock === "out") conditions.push(eq(products.stock, 0));
  if (query.stock === "low")
    conditions.push(between(products.stock, 1, LOW_STOCK_MAX));
  if (query.stock === "in") conditions.push(gt(products.stock, LOW_STOCK_MAX));
  return conditions.length ? and(...conditions) : undefined;
}

const SORT_COLUMNS = {
  updated: products.updatedAt,
  name: products.name,
  price: products.priceCents,
  stock: products.stock,
} as const;

export async function listProducts(db: Database, query: ProductListQuery) {
  const where = productFilters(query);
  const direction = query.dir === "asc" ? asc : desc;

  const [{ total }] = await db
    .select({ total: count() })
    .from(products)
    .where(where);
  const rows = await db
    .select(productColumns)
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(where)
    .orderBy(direction(SORT_COLUMNS[query.sort]), asc(products.id))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  return {
    data: rows.map((row) => ({
      ...row,
      updatedAt: row.updatedAt.toISOString(),
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getProduct(db: Database, id: string) {
  const [row] = await db
    .select(productColumns)
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(eq(products.id, id))
    .limit(1);
  if (!row) throw new NotFoundError("PRODUCT_NOT_FOUND");
  return { ...row, updatedAt: row.updatedAt.toISOString() };
}

function toRow(data: ProductData) {
  return {
    sku: data.sku,
    name: data.name,
    description: data.description,
    categoryId: data.categoryId,
    priceCents: data.price,
    costCents: data.cost,
    stock: data.stock,
    status: data.status,
  };
}

function translateWriteError(error: unknown): never {
  const code = pgErrorCode(error);
  if (code === PG_UNIQUE_VIOLATION) {
    throw new ConflictError("SKU_TAKEN", "Ya existe un producto con ese SKU.");
  }
  if (code === PG_FOREIGN_KEY_VIOLATION) {
    throw new ConflictError("CATEGORY_NOT_FOUND", "La categoría no existe.");
  }
  throw error;
}

export async function createProduct(db: Database, data: ProductData) {
  try {
    const [row] = await db
      .insert(products)
      .values(toRow(data))
      .returning({ id: products.id });
    return getProduct(db, row.id);
  } catch (error) {
    translateWriteError(error);
  }
}

export async function updateProduct(
  db: Database,
  id: string,
  data: ProductData,
) {
  let updated: { id: string } | undefined;
  try {
    [updated] = await db
      .update(products)
      .set({ ...toRow(data), updatedAt: sql`now()` })
      .where(eq(products.id, id))
      .returning({ id: products.id });
  } catch (error) {
    translateWriteError(error);
  }
  if (!updated) throw new NotFoundError("PRODUCT_NOT_FOUND");
  return getProduct(db, id);
}

/** Un producto con pedidos no se borra (rompería su historial): se sugiere archivarlo. */
export async function deleteProduct(db: Database, id: string) {
  try {
    const deleted = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning({ id: products.id });
    if (deleted.length === 0) throw new NotFoundError("PRODUCT_NOT_FOUND");
  } catch (error) {
    if (pgErrorCode(error) === PG_FOREIGN_KEY_VIOLATION) {
      throw new ConflictError(
        "PRODUCT_IN_USE",
        "El producto aparece en pedidos y no se puede eliminar. Cámbialo a «Archivado».",
      );
    }
    throw error;
  }
}

/** ¿Está libre el SKU? (sin contar el producto que se está editando). */
export async function isSkuAvailable(
  db: Database,
  sku: string,
  excludeId?: string,
) {
  const conditions = [eq(products.sku, sku.trim().toUpperCase())];
  if (excludeId) conditions.push(ne(products.id, excludeId));
  const [row] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(...conditions))
    .limit(1);
  return !row;
}

export async function listCategories(db: Database) {
  return db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.name));
}
