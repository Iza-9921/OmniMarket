import { redirect } from "next/navigation";
import { connection } from "next/server";
import { LOGIN_PATH } from "@/lib/auth-routing";
import { auth } from "./index";

/**
 * Usuario de la sesión actual o redirección a /login. Segunda línea de defensa
 * tras el proxy: toda página o acción privada debe llamarla.
 */
export async function requireUser() {
  // auth() genera valores aleatorios (token CSRF): con Cache Components eso solo
  // se permite en tiempo de petición, no durante el prerender.
  await connection();
  const session = await auth();
  if (!session?.user?.id) redirect(LOGIN_PATH);
  return session.user;
}
