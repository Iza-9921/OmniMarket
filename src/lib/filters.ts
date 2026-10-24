import type { z } from "@/lib/zod";

// Estado de los filtros de una tabla ↔ query string de la URL. Así un listado
// filtrado se puede recargar, compartir y volver atrás sin perder los filtros.

type Primitive = string | number | undefined;

/**
 * Lee los filtros de la URL. Un parámetro inválido (p. ej. `?page=abc`) se
 * descarta y se usa su valor por defecto, en lugar de romper la página.
 */
export function filtersFromParams<S extends z.ZodType>(
  schema: S,
  params: URLSearchParams,
): z.output<S> {
  const raw: Record<string, string> = {};
  for (const [key, value] of params) if (value !== "") raw[key] = value;

  const parsed = schema.safeParse(raw);
  if (parsed.success) return parsed.data;

  // Quita los campos con error y vuelve a intentarlo.
  const invalid = new Set(parsed.error.issues.map((i) => String(i.path[0])));
  for (const key of invalid) delete raw[key];
  const retry = schema.safeParse(raw);
  return retry.success ? retry.data : schema.parse({});
}

/**
 * Escribe los filtros en una query string, omitiendo los vacíos y los que
 * coinciden con el valor por defecto (URLs cortas y estables).
 */
export function filtersToParams(
  filters: Record<string, Primitive>,
  defaults: Record<string, Primitive> = {},
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === "" || value === defaults[key])
      continue;
    params.set(key, String(value));
  }
  return params.toString();
}

/** Cambiar un filtro devuelve a la página 1; cambiar de página conserva los filtros. */
export function updateFilters<T extends Record<string, Primitive>>(
  current: T,
  changes: Partial<T>,
): T {
  const next = { ...current, ...changes };
  if (!("page" in changes)) (next as Record<string, Primitive>).page = 1;
  return next;
}
