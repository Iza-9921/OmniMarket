import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { decideAccess } from "@/lib/auth-routing";

// Protege las rutas privadas (reglas en decideAccess).
//
// Solo LEE el JWT de la cookie (firma y caducidad) y nunca la reescribe. El
// middleware de Auth.js renovaba la cookie en cada petición: un prefetch que
// salía antes de cerrar sesión y respondía después volvía a abrirla.
// La sesión dura 8 horas desde el inicio de sesión (sin renovación automática).
export default async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: request.nextUrl.protocol === "https:",
  });

  const { pathname, search } = request.nextUrl;
  const decision = decideAccess(pathname, token !== null, search);
  if (decision.type === "allow") return NextResponse.next();
  if (decision.type === "unauthorized") {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  return NextResponse.redirect(new URL(decision.to, request.url));
}

export const config = {
  // Excluye archivos estáticos y las APIs públicas, para no añadir latencia a
  // los endpoints de auditoría (objetivo < 300 ms).
  matcher: [
    "/((?!_next/static|_next/image|api/auth|api/test|api/health|favicon.ico|.*\\.[\\w]+$).*)",
  ],
};
