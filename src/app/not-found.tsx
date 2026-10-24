import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { ErrorScreen } from "@/components/error-screen";
import { ButtonLink } from "@/components/ui/controls";

export const metadata: Metadata = { title: "Página no encontrada" };

// 404 de toda la app. Sin sesión, el proxy ya manda las rutas desconocidas a
// /login, así que aquí solo llega quien inició sesión.
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col px-4 py-8">
      <Link
        href="/dashboard"
        aria-label="Ir al dashboard"
        className="self-start"
      >
        <Brand />
      </Link>
      <ErrorScreen
        code="Error 404"
        title="No encontramos esta página"
        message="Puede que la dirección esté mal escrita o que la página ya no exista."
      >
        <ButtonLink href="/dashboard">Ir al dashboard</ButtonLink>
        <ButtonLink href="/orders" variant="secondary">
          Ver pedidos
        </ButtonLink>
      </ErrorScreen>
    </main>
  );
}
