import { productInputSchema } from "@/lib/schemas/catalog";
import { z } from "@/lib/zod";
import { apiUser } from "@/server/auth/api";
import { getDb } from "@/server/db/client";
import {
  errorResponse,
  invalidBody,
  json,
  readJson,
  serviceError,
} from "@/server/http";
import {
  deleteProduct,
  getProduct,
  updateProduct,
} from "@/server/services/products";

type Context = RouteContext<"/api/products/[id]">;

async function productId(context: Context) {
  const { id } = await context.params;
  return z.uuid().safeParse(id).success ? id : null;
}

export async function GET(_request: Request, context: Context) {
  const session = await apiUser();
  if (session.error) return session.error;
  const id = await productId(context);
  if (!id) return errorResponse(404, "PRODUCT_NOT_FOUND");

  try {
    return json(await getProduct(getDb(), id));
  } catch (error) {
    return serviceError("GET /api/products/[id]", error);
  }
}

export async function PATCH(request: Request, context: Context) {
  const session = await apiUser({ mutate: true });
  if (session.error) return session.error;
  const id = await productId(context);
  if (!id) return errorResponse(404, "PRODUCT_NOT_FOUND");

  const parsed = productInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return invalidBody(parsed.error.issues);

  try {
    return json(await updateProduct(getDb(), id, parsed.data));
  } catch (error) {
    return serviceError("PATCH /api/products/[id]", error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  const session = await apiUser({ mutate: true });
  if (session.error) return session.error;
  const id = await productId(context);
  if (!id) return errorResponse(404, "PRODUCT_NOT_FOUND");

  try {
    await deleteProduct(getDb(), id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return serviceError("DELETE /api/products/[id]", error);
  }
}
