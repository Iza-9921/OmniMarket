import { statusChangeSchema } from "@/lib/schemas/catalog";
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
import { updateOrderStatus } from "@/server/services/orders";

// PATCH /api/orders/[id]/status { status, version } — movimiento del Kanban.
export async function PATCH(
  request: Request,
  context: RouteContext<"/api/orders/[id]/status">,
) {
  const session = await apiUser({ mutate: true });
  if (session.error) return session.error;

  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) {
    return errorResponse(404, "ORDER_NOT_FOUND");
  }

  const parsed = statusChangeSchema.safeParse(await readJson(request));
  if (!parsed.success) return invalidBody(parsed.error.issues);

  try {
    const card = await updateOrderStatus(
      getDb(),
      id,
      parsed.data.status,
      parsed.data.version,
      session.user.id,
    );
    return json(card);
  } catch (error) {
    return serviceError("PATCH /api/orders/[id]/status", error);
  }
}
