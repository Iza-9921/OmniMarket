import { createHash, timingSafeEqual } from "node:crypto";
import type { z } from "zod";
import { ConflictError, DomainValidationError, NotFoundError } from "./errors";

const NO_STORE = { "Cache-Control": "no-store" };

export function json(body: unknown, init: ResponseInit = {}) {
  return Response.json(body, {
    ...init,
    headers: { ...NO_STORE, ...init.headers },
  });
}

export function errorResponse(
  status: number,
  error: string,
  extra: Record<string, unknown> = {},
) {
  return json({ error, ...extra }, { status });
}

export function invalidQuery(issues: z.core.$ZodIssue[]) {
  return errorResponse(400, "INVALID_QUERY", {
    issues: issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  });
}

export function invalidBody(issues: z.core.$ZodIssue[]) {
  return errorResponse(400, "INVALID_BODY", {
    issues: issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  });
}

/** Lee el cuerpo JSON; un cuerpo mal formado se trata como objeto vacío (falla la validación). */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

/** Registra el error en el servidor y responde 500 sin filtrar detalles internos. */
export function internalError(context: string, error: unknown) {
  console.error(`[${context}]`, error);
  return errorResponse(500, "INTERNAL_ERROR");
}

/** Traduce los errores de dominio a su respuesta HTTP; el resto es un 500. */
export function serviceError(context: string, error: unknown) {
  if (error instanceof NotFoundError) return errorResponse(404, error.code);
  if (error instanceof ConflictError) {
    return errorResponse(409, error.code, { message: error.message });
  }
  if (error instanceof DomainValidationError) {
    return errorResponse(422, error.code, { message: error.message });
  }
  return internalError(context, error);
}

/** Mide una operación y la expone en la cabecera Server-Timing. */
export async function timed<T>(fn: () => Promise<T>) {
  const started = performance.now();
  const result = await fn();
  const durationMs = Math.round((performance.now() - started) * 10) / 10;
  return {
    result,
    durationMs,
    serverTiming: `db;desc="consultas";dur=${durationMs}`,
  };
}

/**
 * Compara el token recibido con el esperado en tiempo constante.
 * Se comparan los hashes para no filtrar la longitud del token.
 */
export function isValidToken(received: string | null, expected: string) {
  if (!received) return false;
  const a = createHash("sha256").update(received).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
