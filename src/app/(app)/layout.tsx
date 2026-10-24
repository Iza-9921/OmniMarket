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
          {/* En celular la navegación baja a una segunda fila con desplazamiento
              propio, para que la página nunca se desborde a los lados. */}
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 md:h-16 md:flex-nowrap md:py-0">
            <Link href="/dashboard" aria-label="Ir al dashboard">
              <Brand />
            </Link>
            <div className="relative order-last -mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 md:order-none md:mx-0 md:mr-auto md:w-auto md:px-0">
              <Suspense fallback={<NavLinks />}>
                <AppNav />
              </Suspense>
            </div>
            <Suspense fallback={<UserMenuSkeleton />}>
              <UserMenu />
            </Suspense>
          </div>
        </header>
        <div className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 py-8">
          {children}
        </div>
      </div>
    </Providers>
  );
}
