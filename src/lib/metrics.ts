// Cálculos financieros. Todas las cantidades van en centavos (enteros).
//
// Definiciones (únicas para el dashboard y para /api/test/analytics):
// - Ingresos: suma de subtotales (sin IVA) de los pedidos no cancelados.
// - Ticket promedio: ingresos / número de pedidos no cancelados.
// - Margen bruto: ingresos − costo de la mercancía vendida.
// - Margen bruto %: margen bruto / ingresos × 100.

/** Ticket promedio en centavos, redondeado al centavo. Sin pedidos devuelve 0. */
export function avgTicket(revenueCents: number, orders: number): number {
  if (orders <= 0) return 0;
  return Math.round(revenueCents / orders);
}

/** Margen bruto en centavos. Puede ser negativo si el costo supera los ingresos. */
export function grossMargin(revenueCents: number, costCents: number): number {
  return revenueCents - costCents;
}

/** Margen bruto como porcentaje con dos decimales. Sin ingresos devuelve 0. */
export function grossMarginPct(
  revenueCents: number,
  costCents: number,
): number {
  if (revenueCents === 0) return 0;
  const pct = (grossMargin(revenueCents, costCents) / revenueCents) * 100;
  return Math.round(pct * 100) / 100;
}

/** Calcula los importes de un pedido a partir de sus líneas. */
export function orderTotals(
  lines: { quantity: number; unitPriceCents: number; unitCostCents: number }[],
  taxRate: number,
) {
  const subtotalCents = lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPriceCents,
    0,
  );
  const costCents = lines.reduce(
    (sum, line) => sum + line.quantity * line.unitCostCents,
    0,
  );
  const taxCents = Math.round(subtotalCents * taxRate);
  return {
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
    costCents,
  };
}
