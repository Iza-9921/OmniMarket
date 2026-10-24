// Errores de dominio que los servicios lanzan y la capa HTTP traduce a respuestas.

export class NotFoundError extends Error {
  constructor(public readonly code = "NOT_FOUND") {
    super(code);
  }
}

export class ConflictError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export class DomainValidationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Código de error de PostgreSQL, venga directo de `pg` o envuelto por Drizzle. */
export function pgErrorCode(error: unknown): string | undefined {
  const direct = (error as { code?: unknown })?.code;
  if (typeof direct === "string") return direct;
  const cause = (error as { cause?: { code?: unknown } })?.cause?.code;
  return typeof cause === "string" ? cause : undefined;
}

export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";
