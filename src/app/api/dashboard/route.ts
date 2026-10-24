import { dashboardQuerySchema, resolveRange } from "@/lib/dashboard";
import { toBusinessDay } from "@/lib/format";
import { searchParamsToObject } from "@/lib/schemas/test-endpoints";
import { apiUser } from "@/server/auth/api";
import { getDb } from "@/server/db/client";
import { invalidQuery, json, serviceError, timed } from "@/server/http";
import { getDashboard } from "@/server/services/analytics";

// GET /api/dashboard?range=30d | ?range=custom&from=YYYY-MM-DD&to=YYYY-MM-DD
// Los rangos predefinidos terminan "hoy" en la zona horaria del negocio.
export async function GET(request: Request) {
  const session = await apiUser();
  if (session.error) return session.error;

  const parsed = dashboardQuerySchema.safeParse(
    searchParamsToObject(new URL(request.url).searchParams),
  );
  if (!parsed.success) return invalidQuery(parsed.error.issues);

  try {
    const range = resolveRange(parsed.data, toBusinessDay(new Date()));
    const { result, durationMs, serverTiming } = await timed(() =>
      getDashboard(getDb(), range),
    );
    return json(
      { ...result, meta: { durationMs } },
      { headers: { "Server-Timing": serverTiming } },
    );
  } catch (error) {
    return serviceError("GET /api/dashboard", error);
  }
}
