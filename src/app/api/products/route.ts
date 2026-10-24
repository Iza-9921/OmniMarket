import { productInputSchema } from "@/lib/schemas/catalog";
import { productListQuerySchema } from "@/lib/schemas/lists";
import { searchParamsToObject } from "@/lib/schemas/test-endpoints";
import { apiUser } from "@/server/auth/api";
import { getDb } from "@/server/db/client";
import {
  invalidBody,
  invalidQuery,
  json,
  readJson,
  serviceError,
  timed,
} from "@/server/http";
import { createProduct, listProducts } from "@/server/services/products";

// GET /api/products?page&limit&q&categoryId&status&stock&sort&dir
export async function GET(request: Request) {
  const session = await apiUser();
  if (session.error) return session.error;

  const parsed = productListQuerySchema.safeParse(
    searchParamsToObject(new URL(request.url).searchParams),
  );
  if (!parsed.success) return invalidQuery(parsed.error.issues);

  try {
    const { result, durationMs, serverTiming } = await timed(() =>
      listProducts(getDb(), parsed.data),
    );
    return json(
      { ...result, meta: { durationMs } },
      { headers: { "Server-Timing": serverTiming } },
    );
  } catch (error) {
    return serviceError("GET /api/products", error);
  }
}

// POST /api/products
export async function POST(request: Request) {
  const session = await apiUser({ mutate: true });
  if (session.error) return session.error;

  const parsed = productInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return invalidBody(parsed.error.issues);

  try {
    const product = await createProduct(getDb(), parsed.data);
    return json(product, { status: 201 });
  } catch (error) {
    return serviceError("POST /api/products", error);
  }
}
