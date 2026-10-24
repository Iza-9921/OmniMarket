import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import { getDb } from "@/server/db/client";
import { accounts, users } from "@/server/db/schema";
import { authConfig } from "./config";

// Inicialización diferida: la conexión a la base de datos solo se crea cuando
// Auth.js la necesita (alta de usuario o vinculación de cuenta), nunca en el build.
export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  ...authConfig,
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
  }),
}));
