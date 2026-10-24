import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <main>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <Suspense fallback={<Skeleton className="mt-2 h-5 w-64" />}>
          <Greeting />
        </Suspense>
      </div>
      <Suspense fallback={<Skeleton className="h-10 w-96" />}>
        <DashboardView />
      </Suspense>
    </main>
  );
}

async function Greeting() {
  const user = await requireUser();
  const firstName = (user.name ?? "").split(" ")[0];
  return (
    <p className="mt-1 text-sm text-slate-600" data-testid="greeting">
      Hola{firstName ? `, ${firstName}` : ""}. Así van las ventas de OmniMarket.
    </p>
  );
}
