import { getDb } from "@/server/db/client";
import {
  errorResponse,
  internalError,
  isValidToken,
  json,
} from "@/server/http";
import { resetDatabase } from "@/server/services/reset";

// POST /api/test/reset-data
// Restablece la base de datos al conjunto de prueba conocido. Exige la cabecera
// `x-test-token` igual a TEST_ENDPOINTS_TOKEN (decisión D1). Sin esa variable
// configurada, el endpoint queda deshabilitado.
export async function POST(request: Request) {
  // trim(): tolera un salto de línea copiado por error al configurar la variable.
  const expected = process.env.TEST_ENDPOINTS_TOKEN?.trim();
  if (!expected) return errorResponse(503, "TEST_ENDPOINTS_DISABLED");

  if (!isValidToken(request.headers.get("x-test-token"), expected)) {
    return errorResponse(401, "INVALID_TEST_TOKEN");
  }

  try {
    const result = await resetDatabase(getDb());
    return json({ ok: true, ...result });
  } catch (error) {
    return internalError("POST /api/test/reset-data", error);
  }
}
