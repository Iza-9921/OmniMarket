import Link from "next/link";
import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { UserMenu, UserMenuSkeleton } from "@/components/user-menu";

// Shell de las páginas privadas. El proxy ya exige sesión; además, UserMenu y
// cada página llaman a requireUser() como segunda línea de defensa.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/dashboard" aria-label="Ir al dashboard">
            <Brand />
          </Link>
          <Suspense fallback={<UserMenuSkeleton />}>
            <UserMenu />
          </Suspense>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </div>
    </div>
  );
}
