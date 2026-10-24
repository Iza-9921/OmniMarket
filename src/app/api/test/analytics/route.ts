import {
  analyticsQuerySchema,
  searchParamsToObject,
} from "@/lib/schemas/test-endpoints";
import { getDb } from "@/server/db/client";
import { internalError, invalidQuery, json, timed } from "@/server/http";
import { getSalesAnalytics } from "@/server/services/analytics";

// GET /api/test/analytics?page=1&limit=50[&from=YYYY-MM-DD&to=YYYY-MM-DD]
// Público y de solo lectura (decisión D1).
export async function GET(request: Request) {
  const parsed = analyticsQuerySchema.safeParse(
    searchParamsToObject(new URL(request.url).searchParams),
  );
  if (!parsed.success) return invalidQuery(parsed.error.issues);

  try {
    const { result, durationMs, serverTiming } = await timed(() =>
      getSalesAnalytics(getDb(), parsed.data),
    );
    return json(
      {
        ...result,
        meta: {
          durationMs,
          generatedAt: new Date().toISOString(),
          range: { from: parsed.data.from ?? null, to: parsed.data.to ?? null },
        },
      },
      { headers: { "Server-Timing": serverTiming } },
    );
  } catch (error) {
    return internalError("GET /api/test/analytics", error);
  }
}
