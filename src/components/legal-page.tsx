import Link from "next/link";
import { Brand } from "@/components/brand";

// Contenedor de las páginas legales públicas (las enlaza la pantalla de
// consentimiento de Google OAuth).
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <Link href="/login" aria-label="Ir al inicio de sesión">
        <Brand />
      </Link>
      <h1 className="mt-10 text-3xl font-semibold tracking-tight text-slate-900">
        {title}
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Última actualización: {updated}
      </p>
      <div className="mt-8 space-y-6 text-slate-700 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900 [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-7">
        {children}
      </div>
    </main>
  );
}
