import { productBulkSchema } from "@/lib/bulk";
import { apiUser } from "@/server/auth/api";
import { getDb } from "@/server/db/client";
import { invalidBody, json, readJson, serviceError } from "@/server/http";
import { bulkUpdateProducts } from "@/server/services/products";

// PATCH /api/products/bulk { ids, changes } — edición en lote, todo o nada.
export async function PATCH(request: Request) {
  const session = await apiUser({ mutate: true });
  if (session.error) return session.error;

  const parsed = productBulkSchema.safeParse(await readJson(request));
  if (!parsed.success) return invalidBody(parsed.error.issues);

  try {
    return json(
      await bulkUpdateProducts(getDb(), parsed.data.ids, parsed.data.changes),
    );
  } catch (error) {
    return serviceError("PATCH /api/products/bulk", error);
  }
}
