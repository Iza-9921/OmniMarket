import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { DEFAULT_USER_ROLE, type UserRole } from "@/lib/domain";
import { LOGIN_PATH } from "@/lib/auth-routing";

// Configuración de Auth.js sin acceso a la base de datos; el adaptador de
// Drizzle se añade en ./index.ts. El control de acceso por ruta lo hace
// src/proxy.ts leyendo el JWT, sin pasar por Auth.js.
// Las credenciales salen de AUTH_GOOGLE_ID/SECRET y AUTH_GITHUB_ID/SECRET.
export const authConfig = {
  providers: [Google, GitHub],
  pages: { signIn: LOGIN_PATH, error: LOGIN_PATH },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  // En Vercel el host lo fija la plataforma; en local y en CI, `next start`.
  trustHost: true,
  callbacks: {
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
