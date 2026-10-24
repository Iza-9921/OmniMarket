import { redirect } from "next/navigation";
import { HOME_PATH } from "@/lib/auth-routing";

// La raíz lleva al dashboard; sin sesión, el proxy redirige antes a /login.
export default function Home() {
  redirect(HOME_PATH);
}
