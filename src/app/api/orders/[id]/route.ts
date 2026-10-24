import { orderInputSchema } from "@/lib/schemas/catalog";
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
import { deleteOrder, getOrder, updateOrder } from "@/server/services/orders";

type Context = RouteContext<"/api/orders/[id]">;

async function orderId(context: Context) {
  const { id } = await context.params;
  return z.uuid().safeParse(id).success ? id : null;
}

export async function GET(_request: Request, context: Context) {
  const session = await apiUser();
  if (session.error) return session.error;
  const id = await orderId(context);
  if (!id) return errorResponse(404, "ORDER_NOT_FOUND");

  try {
    return json(await getOrder(getDb(), id));
  } catch (error) {
    return serviceError("GET /api/orders/[id]", error);
  }
}

export async function PATCH(request: Request, context: Context) {
  const session = await apiUser({ mutate: true });
  if (session.error) return session.error;
  const id = await orderId(context);
  if (!id) return errorResponse(404, "ORDER_NOT_FOUND");

  const parsed = orderInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return invalidBody(parsed.error.issues);

  try {
    return json(await updateOrder(getDb(), id, parsed.data, session.user.id));
  } catch (error) {
    return serviceError("PATCH /api/orders/[id]", error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  const session = await apiUser({ mutate: true });
  if (session.error) return session.error;
  const id = await orderId(context);
  if (!id) return errorResponse(404, "ORDER_NOT_FOUND");

  try {
    await deleteOrder(getDb(), id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return serviceError("DELETE /api/orders/[id]", error);
  }
}
