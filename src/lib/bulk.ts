import {
  ORDER_STATUSES,
  PRODUCT_STATUSES,
  type OrderStatus,
  type ProductStatus,
} from "./domain";
import { z } from "./zod";

// Edición en lote (RF-50…54): esquemas compartidos por la UI y la API, y la
// aplicación pura de los cambios para la actualización optimista.

export const MAX_BULK_ROWS = 100;

const ids = z
  .array(z.uuid())
  .min(1, "Selecciona al menos una fila")
  .max(MAX_BULK_ROWS, `Máximo ${MAX_BULK_ROWS} filas por operación`)
  .refine((list) => new Set(list).size === list.length, "Hay filas repetidas");

export const productBulkSchema = z.object({
  ids,
  changes: z
    .object({
      status: z.enum(PRODUCT_STATUSES).optional(),
      categoryId: z.coerce.number().int().positive().optional(),
      stock: z.coerce
        .number()
        .int("El stock debe ser un número entero")
        .min(0, "El stock no puede ser negativo")
        .max(1_000_000)
        .optional(),
      // Porcentaje sobre el precio actual: −90 % a +500 %, con hasta 2 decimales.
      priceAdjustPct: z.coerce
        .number()
        .min(-90, "Mínimo −90 %")
        .max(500, "Máximo +500 %")
        .refine(
          // Con tolerancia: 10.15 * 100 da 1014.999… en punto flotante.
          (n) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6,
          "Máximo 2 decimales",
        )
        .optional(),
    })
    .refine(
      (changes) => Object.values(changes).some((value) => value !== undefined),
      "Elige al menos un cambio",
    ),
});

export type ProductBulkInput = z.input<typeof productBulkSchema>;
export type ProductChanges = z.output<typeof productBulkSchema>["changes"];

export const orderBulkSchema = z.object({
  ids,
  status: z.enum(ORDER_STATUSES),
});

export type OrderBulkInput = z.input<typeof orderBulkSchema>;

/** Precio tras un ajuste porcentual, redondeado al centavo y nunca negativo. */
export function adjustPrice(priceCents: number, pct: number) {
  return Math.max(0, Math.round(priceCents * (1 + pct / 100)));
}

type ProductRow = {
  id: string;
  status: ProductStatus;
  categoryId: number;
  categoryName: string;
  priceCents: number;
  stock: number;
};

/** Aplica los cambios a las filas seleccionadas (las demás quedan igual). */
export function applyProductChanges<T extends ProductRow>(
  rows: T[],
  selected: Set<string>,
  changes: ProductChanges,
  categoryName?: string,
): T[] {
  return rows.map((row) => {
    if (!selected.has(row.id)) return row;
    return {
      ...row,
      ...(changes.status && { status: changes.status }),
      ...(changes.categoryId && {
        categoryId: changes.categoryId,
        categoryName: categoryName ?? row.categoryName,
      }),
      ...(changes.stock !== undefined && { stock: changes.stock }),
      ...(changes.priceAdjustPct !== undefined && {
        priceCents: adjustPrice(row.priceCents, changes.priceAdjustPct),
      }),
    };
  });
}

/** Cambia el estado de los pedidos seleccionados. */
export function applyOrderStatus<T extends { id: string; status: OrderStatus }>(
  rows: T[],
  selected: Set<string>,
  status: OrderStatus,
): T[] {
  return rows.map((row) => (selected.has(row.id) ? { ...row, status } : row));
}
