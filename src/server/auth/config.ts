import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { DEFAULT_USER_ROLE, type UserRole } from "@/lib/domain";
import { decideAccess, LOGIN_PATH } from "@/lib/auth-routing";

// Configuración sin acceso a la base de datos: la usa el proxy en cada petición.
// El adaptador de Drizzle se añade en ./index.ts, solo para el inicio de sesión.
// Las credenciales salen de AUTH_GOOGLE_ID/SECRET y AUTH_GITHUB_ID/SECRET.
export const authConfig = {
  providers: [Google, GitHub],
  pages: { signIn: LOGIN_PATH, error: LOGIN_PATH },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  // En Vercel el host lo fija la plataforma; en local y en CI, `next start`.
  trustHost: true,
  callbacks: {
    authorized({ auth, request }) {
      const { pathname, search } = request.nextUrl;
      const decision = decideAccess(pathname, Boolean(auth?.user), search);
      if (decision.type === "allow") return true;
      if (decision.type === "unauthorized") {
        return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
      }
      return Response.redirect(new URL(decision.to, request.nextUrl));
    },
    jwt({ token, user }) {
      // `user` solo llega al iniciar sesión: el rol se copia de la base de datos al token.
      if (user) {
        token.role = (user as { role?: UserRole }).role ?? DEFAULT_USER_ROLE;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.user.role = token.role ?? DEFAULT_USER_ROLE;
      return session;
    },
  },
} satisfies NextAuthConfig;
