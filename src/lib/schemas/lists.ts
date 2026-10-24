import { ORDER_STATUSES, PRODUCT_STATUSES } from "@/lib/domain";
import { z } from "@/lib/zod";
import { MAX_PAGE_LIMIT } from "./test-endpoints";

// Parámetros de los listados paginados (query string de la API y de la URL).

const page = z.coerce.number().int().min(1).default(1);
const limit = z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(20);
const search = z
  .string()
  .trim()
  .max(100)
  .optional()
  .transform((value) => value || undefined);
const isoDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato YYYY-MM-DD");

/** Filtro de stock: agotado (0), bajo (1–10) o disponible (> 10). */
export const STOCK_FILTERS = ["out", "low", "in"] as const;
export const LOW_STOCK_MAX = 10;

export const productListQuerySchema = z.object({
  page,
  limit,
  q: search,
  categoryId: z.coerce.number().int().positive().optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  stock: z.enum(STOCK_FILTERS).optional(),
  sort: z.enum(["updated", "name", "price", "stock"]).default("updated"),
  dir: z.enum(["asc", "desc"]).default("desc"),
});

export type ProductListQuery = z.output<typeof productListQuerySchema>;

export const orderListQuerySchema = z
  .object({
    page,
    limit,
    q: search,
    status: z.enum(ORDER_STATUSES).optional(),
    customerId: z.coerce.number().int().positive().optional(),
    from: isoDay.optional(),
    to: isoDay.optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: "`from` debe ser anterior o igual a `to`",
    path: ["from"],
  });

export type OrderListQuery = z.output<typeof orderListQuerySchema>;
