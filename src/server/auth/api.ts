import { connection } from "next/server";
import { canMutate } from "@/lib/permissions";
import { errorResponse } from "@/server/http";
import { auth } from "./index";

/**
 * Sesión para un Route Handler privado. El proxy ya responde 401 sin sesión;
 * esto es la segunda línea de defensa y añade el control por rol.
 * Devuelve el usuario o la respuesta de error lista para retornar.
 */
export async function apiUser({ mutate = false } = {}) {
  await connection();
  const session = await auth();
  if (!session?.user?.id) {
    return { error: errorResponse(401, "UNAUTHENTICATED") } as const;
  }
  if (mutate && !canMutate(session.user.role)) {
    return { error: errorResponse(403, "FORBIDDEN") } as const;
  }
  return { user: session.user } as const;
}
