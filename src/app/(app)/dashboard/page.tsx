import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Dashboard" };

// Provisional: el dashboard analítico se construye en F6.
export default function DashboardPage() {
  return (
    <main>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Dashboard
      </h1>
      <Suspense fallback={<Skeleton className="mt-3 h-5 w-64" />}>
        <Greeting />
      </Suspense>
      <p className="mt-6 max-w-xl rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
        Ya puedes administrar{" "}
        <Link
          href="/products"
          className="font-medium text-indigo-600 hover:underline"
        >
          productos
        </Link>{" "}
        y{" "}
        <Link
          href="/orders"
          className="font-medium text-indigo-600 hover:underline"
        >
          pedidos
        </Link>
        . Las métricas de ventas y el tablero Kanban se incorporan en las
        siguientes fases del proyecto.
      </p>
    </main>
  );
}

async function Greeting() {
  const user = await requireUser();
  const firstName = (user.name ?? "").split(" ")[0];
  return (
    <p className="mt-2 text-slate-600" data-testid="greeting">
      Hola{firstName ? `, ${firstName}` : ""}. Has iniciado sesión
      correctamente.
    </p>
  );
}
