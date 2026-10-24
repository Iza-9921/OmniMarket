// Conversión entre importes escritos por una persona ("199.99") y centavos (19999).

export const MONEY_PATTERN = /^\d{1,7}(\.\d{1,2})?$/;

/** "199.9" → 19990. Asume un texto que ya cumple MONEY_PATTERN. */
export function parseMoneyToCents(value: string): number {
  const [pesos, fraction = ""] = value.trim().split(".");
  return Number(pesos) * 100 + Number(fraction.padEnd(2, "0"));
}

/** 19990 → "199.90" (para rellenar un formulario de edición). */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
