import { z } from "@/lib/zod";

export const MAX_PAGE_LIMIT = 100;

const isoDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato YYYY-MM-DD")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), {
    message: "Fecha inválida",
  });

/** Parámetros de GET /api/test/analytics. */
export const analyticsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(50),
    from: isoDay.optional(),
    to: isoDay.optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: "`from` debe ser anterior o igual a `to`",
    path: ["from"],
  });

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

/** Parámetros de GET /api/test/kanban-status. */
export const kanbanStatusQuerySchema = z.object({
  orderId: z
    .string()
    .regex(/^ORD-\d{4,}$/, "Usa el código del pedido, p. ej. ORD-0001")
    .optional(),
});

/** Convierte URLSearchParams en objeto, ignorando parámetros vacíos. */
export function searchParamsToObject(params: URLSearchParams) {
  return Object.fromEntries(
    [...params.entries()].filter(([, value]) => value !== ""),
  );
}
