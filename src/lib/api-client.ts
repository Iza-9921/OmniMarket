// Cliente HTTP del navegador para la API propia. Convierte las respuestas de
// error en ApiError con un mensaje en español listo para un toast.

export type FieldIssue = { path: string; message: string };

const MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Tu sesión expiró. Vuelve a iniciar sesión.",
  FORBIDDEN: "Tu rol no permite hacer cambios.",
  INVALID_BODY: "Revisa los campos marcados.",
  PRODUCT_NOT_FOUND: "El producto ya no existe.",
  ORDER_NOT_FOUND: "El pedido ya no existe.",
  INTERNAL_ERROR: "Algo salió mal en el servidor. Inténtalo de nuevo.",
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly issues: FieldIssue[] = [],
  ) {
    super(message);
  }
}

export async function apiFetch<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Sin conexión con el servidor.");
  }

  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = typeof body.error === "string" ? body.error : "INTERNAL_ERROR";
    const message =
      (typeof body.message === "string" && body.message) ||
      MESSAGES[code] ||
      MESSAGES.INTERNAL_ERROR;
    throw new ApiError(response.status, code, message, body.issues ?? []);
  }
  return body as T;
}

export const jsonBody = (data: unknown) => JSON.stringify(data);
