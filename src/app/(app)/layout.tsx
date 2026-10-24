import Link from "next/link";
import { Suspense } from "react";
import { AppNav, NavLinks } from "@/components/app-nav";
import { Brand } from "@/components/brand";
import { Providers } from "@/components/providers";
import { UserMenu, UserMenuSkeleton } from "@/components/user-menu";

// Shell de las páginas privadas. El proxy ya exige sesión; además, UserMenu,
// cada página y cada Route Handler validan la sesión como segunda línea de defensa.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Providers>
      <div className="flex min-h-full flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
            <div className="flex items-center gap-6">
              <Link href="/dashboard" aria-label="Ir al dashboard">
                <Brand />
              </Link>
              <Suspense fallback={<NavLinks />}>
                <AppNav />
              </Suspense>
            </div>
            <Suspense fallback={<UserMenuSkeleton />}>
              <UserMenu />
            </Suspense>
          </div>
        </header>
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {children}
        </div>
      </div>
    </Providers>
  );
}
