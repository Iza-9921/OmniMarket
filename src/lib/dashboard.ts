import { z } from "./zod";

// Filtro de fechas del dashboard y utilidades puras de sus series.

export const DASHBOARD_RANGES = {
  "7d": { days: 7, label: "7 días" },
  "30d": { days: 30, label: "30 días" },
  "90d": { days: 90, label: "90 días" },
  "180d": { days: 180, label: "180 días" },
} as const;
export type DashboardPreset = keyof typeof DASHBOARD_RANGES;

const MAX_CUSTOM_DAYS = 366;
const isoDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato YYYY-MM-DD");

export const dashboardQuerySchema = z
  .object({
    range: z.enum(["7d", "30d", "90d", "180d", "custom"]).default("30d"),
    from: isoDay.optional(),
    to: isoDay.optional(),
  })
  .refine((q) => q.range !== "custom" || (q.from && q.to), {
    message: "Elige las dos fechas del rango",
    path: ["from"],
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: "La fecha inicial debe ser anterior a la final",
    path: ["from"],
  })
  .refine(
    (q) => !q.from || !q.to || daysBetween(q.from, q.to) <= MAX_CUSTOM_DAYS,
    { message: `El rango máximo es de ${MAX_CUSTOM_DAYS} días`, path: ["to"] },
  );

export type DashboardQuery = z.output<typeof dashboardQuerySchema>;

const toUtc = (day: string) => Date.parse(`${day}T00:00:00Z`);

export function shiftDay(day: string, delta: number) {
  return new Date(toUtc(day) + delta * 86_400_000).toISOString().slice(0, 10);
}

/** Número de días del rango, ambos extremos incluidos. */
export function daysBetween(from: string, to: string) {
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000) + 1;
}

/** Rango concreto para la consulta: los rangos predefinidos terminan `today`. */
export function resolveRange(query: DashboardQuery, today: string) {
  if (query.range === "custom" && query.from && query.to) {
    return { from: query.from, to: query.to };
  }
  const preset = query.range === "custom" ? "30d" : query.range;
  return {
    from: shiftDay(today, -(DASHBOARD_RANGES[preset].days - 1)),
    to: today,
  };
}

/** Serie diaria continua: los días sin ventas aparecen con cero (sin huecos en la gráfica). */
export function fillDays<T extends { date: string }>(
  rows: T[],
  from: string,
  to: string,
  empty: (date: string) => T,
): T[] {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  const days = daysBetween(from, to);
  return Array.from({ length: Math.max(days, 0) }, (_, i) => {
    const date = shiftDay(from, i);
    return byDate.get(date) ?? empty(date);
  });
}
