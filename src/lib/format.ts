import { CURRENCY, LOCALE, TIME_ZONE } from "./domain";

// Locale y zona horaria fijos: el servidor y el navegador producen el mismo
// texto, lo que evita errores de hidratación en consola.

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Convierte centavos a una cantidad decimal (para respuestas JSON). */
export function centsToAmount(cents: number): number {
  return Math.round(cents) / 100;
}

/** Formatea centavos como moneda, p. ej. 123456 → "$1,234.56". */
export function formatCurrency(cents: number): string {
  return currencyFormatter.format(centsToAmount(cents));
}

/** Formatea una fecha en la zona horaria del negocio, p. ej. "05 oct 2026". */
export function formatDate(value: Date | string): string {
  return dateFormatter.format(
    typeof value === "string" ? new Date(value) : value,
  );
}

/** Día calendario (YYYY-MM-DD) de una fecha en la zona horaria del negocio. */
export function toBusinessDay(value: Date): string {
  return dayKeyFormatter.format(value);
}

/** Importe en pesos (no centavos), p. ej. 9657155.61 → "$9,657,155.61". */
export function formatAmount(amount: number): string {
  return currencyFormatter.format(amount);
}

/**
 * Importe compacto para ejes y etiquetas: $950 · $12.3 mil · $1.2 M.
 * (El formato compacto de Intl en es-MX da "12.3 k$", poco legible.)
 */
export function formatCompactCurrency(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const n = Math.abs(amount);
  const short = (value: number) => value.toFixed(1).replace(/\.0$/, "");
  if (n >= 1_000_000) return `${sign}$${short(n / 1_000_000)} M`;
  if (n >= 1_000) return `${sign}$${short(n / 1_000)} mil`;
  return `${sign}$${Math.round(n)}`;
}

const shortDayFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
});

/** Día calendario "2026-10-24" → "24 oct" (sin desfase por zona horaria). */
export function formatShortDay(day: string): string {
  return shortDayFormatter.format(new Date(`${day}T12:00:00Z`));
}
