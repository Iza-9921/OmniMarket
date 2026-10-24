import NextAuth from "next-auth";
import { authConfig } from "@/server/auth/config";

// Protege todas las rutas privadas (ver `authorized` en la configuración).
// Solo decodifica el JWT de la cookie: no consulta la base de datos.
export default NextAuth(authConfig).auth;

export const config = {
  // Excluye archivos estáticos y las APIs públicas, para no añadir latencia a
  // los endpoints de auditoría (objetivo < 300 ms).
  matcher: [
    "/((?!_next/static|_next/image|api/auth|api/test|api/health|favicon.ico|.*\\.[\\w]+$).*)",
  ],
};
