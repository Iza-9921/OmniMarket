import { orderBulkSchema } from "@/lib/bulk";
import { apiUser } from "@/server/auth/api";
import { getDb } from "@/server/db/client";
import { invalidBody, json, readJson, serviceError } from "@/server/http";
import { bulkUpdateOrderStatus } from "@/server/services/orders";

// PATCH /api/orders/bulk { ids, status } — cambio de estado en lote, todo o nada.
export async function PATCH(request: Request) {
  const session = await apiUser({ mutate: true });
  if (session.error) return session.error;

  const parsed = orderBulkSchema.safeParse(await readJson(request));
  if (!parsed.success) return invalidBody(parsed.error.issues);

  try {
    return json(
      await bulkUpdateOrderStatus(
        getDb(),
        parsed.data.ids,
        parsed.data.status,
        session.user.id,
      ),
    );
  } catch (error) {
    return serviceError("PATCH /api/orders/bulk", error);
  }
}
