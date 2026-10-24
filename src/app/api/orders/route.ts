import { orderInputSchema } from "@/lib/schemas/catalog";
import { orderListQuerySchema } from "@/lib/schemas/lists";
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
import { createOrder, listOrders } from "@/server/services/orders";

// GET /api/orders?page&limit&q&status&customerId&from&to
export async function GET(request: Request) {
  const session = await apiUser();
  if (session.error) return session.error;

  const parsed = orderListQuerySchema.safeParse(
    searchParamsToObject(new URL(request.url).searchParams),
  );
  if (!parsed.success) return invalidQuery(parsed.error.issues);

  try {
    const { result, durationMs, serverTiming } = await timed(() =>
      listOrders(getDb(), parsed.data),
    );
    return json(
      { ...result, meta: { durationMs } },
      { headers: { "Server-Timing": serverTiming } },
    );
  } catch (error) {
    return serviceError("GET /api/orders", error);
  }
}

// POST /api/orders — los totales los calcula el servidor (RF-33).
export async function POST(request: Request) {
  const session = await apiUser({ mutate: true });
  if (session.error) return session.error;

  const parsed = orderInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return invalidBody(parsed.error.issues);

  try {
    const order = await createOrder(getDb(), parsed.data, session.user.id);
    return json(order, { status: 201 });
  } catch (error) {
    return serviceError("POST /api/orders", error);
  }
}
