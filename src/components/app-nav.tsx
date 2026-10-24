"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/products", label: "Productos" },
  { href: "/orders", label: "Pedidos" },
];

export function AppNav() {
  return <NavLinks pathname={usePathname()} />;
}

/** Misma barra sin resaltar: respaldo mientras se resuelve la ruta (Suspense). */
export function NavLinks({ pathname = "" }: { pathname?: string }) {
  return (
    <nav aria-label="Principal" className="flex items-center gap-1">
      {LINKS.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
