import { ORDER_STATUSES, PRODUCT_STATUSES } from "@/lib/domain";
import { MONEY_PATTERN, parseMoneyToCents } from "@/lib/money";
import { z } from "@/lib/zod";

// Esquemas de entrada compartidos: el formulario valida con ellos en el
// navegador y la API vuelve a validar con los mismos en el servidor.

const money = z
  .string()
  .trim()
  .regex(MONEY_PATTERN, "Usa un importe válido, p. ej. 199.99")
  .transform(parseMoneyToCents);

export const productInputSchema = z.object({
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9][A-Z0-9-]{2,23}$/,
      "De 3 a 24 caracteres: letras, números y guiones",
    ),
  name: z
    .string()
    .trim()
    .min(2, "Escribe al menos 2 caracteres")
    .max(120, "Máximo 120 caracteres"),
  description: z.string().trim().max(500, "Máximo 500 caracteres").default(""),
  categoryId: z.coerce.number().int().positive("Elige una categoría"),
  price: money,
  cost: money,
  stock: z.coerce
    .number("Escribe un número")
    .int("Debe ser un número entero")
    .min(0, "No puede ser negativo")
    .max(1_000_000, "Máximo 1,000,000"),
  status: z.enum(PRODUCT_STATUSES),
});

export type ProductInput = z.input<typeof productInputSchema>;
export type ProductData = z.output<typeof productInputSchema>;

export const orderInputSchema = z.object({
  customerId: z.coerce.number().int().positive("Elige un cliente"),
  status: z.enum(ORDER_STATUSES).default("PENDING"),
  items: z
    .array(
      z.object({
        productId: z.uuid("Elige un producto"),
        quantity: z.coerce
          .number("Escribe una cantidad")
          .int("Debe ser un número entero")
          .min(1, "Mínimo 1")
          .max(999, "Máximo 999"),
      }),
    )
    .min(1, "Agrega al menos un producto")
    .max(20, "Máximo 20 productos por pedido")
    .refine(
      (items) => new Set(items.map((i) => i.productId)).size === items.length,
      "Cada producto solo puede aparecer una vez",
    ),
  // Versión que el cliente editó; si otro usuario la cambió antes, la API responde 409.
  version: z.coerce.number().int().positive().optional(),
});

export type OrderInput = z.input<typeof orderInputSchema>;
export type OrderData = z.output<typeof orderInputSchema>;
