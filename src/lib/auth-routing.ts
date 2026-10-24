// Reglas de acceso a rutas. Funciones puras: las usa el proxy y se prueban sin servidor.

export const LOGIN_PATH = "/login";
export const HOME_PATH = "/dashboard";

// Rutas que nunca exigen sesión: el flujo OAuth, los endpoints de auditoría
// (públicos o protegidos por su propio token, decisión D1), la salud del servicio
// y las páginas legales.
const PUBLIC_PREFIXES = ["/api/auth", "/api/test", "/api/health"];
// Páginas legales enlazadas desde la pantalla de consentimiento de Google.
const PUBLIC_PAGES = ["/privacidad", "/terminos"];

export type AccessDecision =
  | { type: "allow" }
  | { type: "redirect"; to: string }
  | { type: "unauthorized" };

const matchesPrefix = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export function isPublicPath(pathname: string) {
  return (
    PUBLIC_PAGES.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))
  );
}

/**
 * Decide qué hacer con una petición según la ruta y si hay sesión:
 * - rutas públicas: pasan siempre;
 * - /login con sesión: al dashboard;
 * - sin sesión: las APIs responden 401 y las páginas redirigen a /login
 *   recordando a dónde se quería ir.
 */
export function decideAccess(
  pathname: string,
  isLoggedIn: boolean,
  search = "",
): AccessDecision {
  if (isPublicPath(pathname)) return { type: "allow" };

  if (pathname === LOGIN_PATH) {
    return isLoggedIn ? { type: "redirect", to: HOME_PATH } : { type: "allow" };
  }

  if (isLoggedIn) return { type: "allow" };
  if (matchesPrefix(pathname, "/api")) return { type: "unauthorized" };

  const callbackUrl = encodeURIComponent(`${pathname}${search}`);
  return { type: "redirect", to: `${LOGIN_PATH}?callbackUrl=${callbackUrl}` };
}

/**
 * Acepta solo rutas internas como destino tras el login. Evita redirecciones
 * abiertas a otros dominios (`//evil.com`, `https://…`, `/\evil.com`).
 */
export function safeCallbackUrl(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//"))
    return HOME_PATH;
  if (value.startsWith("/\\") || value.startsWith(LOGIN_PATH)) return HOME_PATH;
  return value;
}
