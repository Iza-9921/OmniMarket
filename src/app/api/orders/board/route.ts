import { apiUser } from "@/server/auth/api";
import { getDb } from "@/server/db/client";
import { json, serviceError, timed } from "@/server/http";
import { getKanbanBoard } from "@/server/services/orders";

// GET /api/orders/board — tarjetas más recientes y total de cada columna.
export async function GET() {
  const session = await apiUser();
  if (session.error) return session.error;

  try {
    const { result, serverTiming } = await timed(() => getKanbanBoard(getDb()));
    return json(result, { headers: { "Server-Timing": serverTiming } });
  } catch (error) {
    return serviceError("GET /api/orders/board", error);
  }
}
