import { encode } from "next-auth/jwt";

// Simulación de sesión (§5): firma un JWT de Auth.js con el mismo AUTH_SECRET que
// el servidor y lo entrega como cookie. Así se prueba el acceso sin automatizar
// el login real de Google o GitHub (captcha, 2FA).
export const TEST_USER = {
  id: "e2e-user-0001",
  name: "Evaluadora Pruebas",
  email: "evaluadora@ejemplo.mx",
  role: "OPERATOR" as const,
};

export async function sessionCookie(baseURL: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Falta AUTH_SECRET para simular la sesión.");

  const secure = baseURL.startsWith("https://");
  const name = `${secure ? "__Secure-" : ""}authjs.session-token`;
  const value = await encode({
    salt: name,
    secret,
    maxAge: 60 * 60,
    token: {
      sub: TEST_USER.id,
      name: TEST_USER.name,
      email: TEST_USER.email,
      role: TEST_USER.role,
    },
  });

  return {
    name,
    value,
    url: baseURL,
    httpOnly: true,
    secure,
    sameSite: "Lax" as const,
  };
}
