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
