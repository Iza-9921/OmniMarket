import { z } from "@/lib/zod";
import { searchParamsToObject } from "@/lib/schemas/test-endpoints";
import { apiUser } from "@/server/auth/api";
import { getDb } from "@/server/db/client";
import { invalidQuery, json, serviceError } from "@/server/http";
import { isSkuAvailable } from "@/server/services/products";

const querySchema = z.object({
  sku: z.string().trim().min(1).max(24),
  excludeId: z.uuid().optional(),
});

// GET /api/products/sku-availability?sku=ELE-0001[&excludeId=…]
// Responde siempre 200 con { available }: un SKU ocupado es una respuesta
// normal, no un error (así el navegador no registra errores en consola).
export async function GET(request: Request) {
  const session = await apiUser();
  if (session.error) return session.error;

  const parsed = querySchema.safeParse(
    searchParamsToObject(new URL(request.url).searchParams),
  );
  if (!parsed.success) return invalidQuery(parsed.error.issues);

  try {
    const available = await isSkuAvailable(
      getDb(),
      parsed.data.sku,
      parsed.data.excludeId,
    );
    return json({ available });
  } catch (error) {
    return serviceError("GET /api/products/sku-availability", error);
  }
}
