import {
  kanbanStatusQuerySchema,
  searchParamsToObject,
} from "@/lib/schemas/test-endpoints";
import { getDb } from "@/server/db/client";
import {
  errorResponse,
  internalError,
  invalidQuery,
  json,
  timed,
} from "@/server/http";
import {
  getKanbanColumns,
  getOrderKanbanStatus,
} from "@/server/services/kanban";

// GET /api/test/kanban-status?orderId=ORD-0001 → estado de un pedido.
// GET /api/test/kanban-status                  → conteo por columna.
// Público y de solo lectura (decisión D1).
export async function GET(request: Request) {
  const parsed = kanbanStatusQuerySchema.safeParse(
    searchParamsToObject(new URL(request.url).searchParams),
  );
  if (!parsed.success) return invalidQuery(parsed.error.issues);

  const { orderId } = parsed.data;
  try {
    if (!orderId) {
      const { result, serverTiming } = await timed(() =>
        getKanbanColumns(getDb()),
      );
      return json(result, { headers: { "Server-Timing": serverTiming } });
    }

    const { result, serverTiming } = await timed(() =>
      getOrderKanbanStatus(getDb(), orderId),
    );
    if (!result) return errorResponse(404, "ORDER_NOT_FOUND", { orderId });
    return json(result, { headers: { "Server-Timing": serverTiming } });
  } catch (error) {
    return internalError("GET /api/test/kanban-status", error);
  }
}
