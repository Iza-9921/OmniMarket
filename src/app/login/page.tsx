import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { Skeleton } from "@/components/ui/skeleton";
import { safeCallbackUrl } from "@/lib/auth-routing";
import { signIn } from "@/server/auth";

export const metadata: Metadata = { title: "Iniciar sesión" };

// Mensajes para los códigos de error que Auth.js añade a /login?error=…
const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "Ese correo ya está registrado con otro proveedor. Entra con el que usaste la primera vez.",
  AccessDenied: "El proveedor rechazó el acceso. Inténtalo de nuevo.",
  Configuration:
    "El inicio de sesión no está configurado en este entorno. Avisa al equipo.",
};
const DEFAULT_ERROR = "No se pudo iniciar sesión. Inténtalo de nuevo.";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Brand />
        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-slate-900">
          Inicia sesión
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Usa tu cuenta de Google o GitHub. No necesitas contraseña.
        </p>
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm searchParams={searchParams} />
        </Suspense>
        <p className="mt-8 text-center text-xs text-slate-500">
          Al continuar aceptas las{" "}
          <Link href="/terminos" className="underline hover:text-slate-700">
            condiciones del servicio
          </Link>{" "}
          y la{" "}
          <Link href="/privacidad" className="underline hover:text-slate-700">
            política de privacidad
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

async function LoginForm({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const redirectTo = safeCallbackUrl(first(params.callbackUrl));
  const errorCode = first(params.error);

  async function signInWith(provider: "google" | "github") {
    "use server";
    await signIn(provider, { redirectTo });
  }

  return (
    <>
      {errorCode && (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {ERROR_MESSAGES[errorCode] ?? DEFAULT_ERROR}
        </p>
      )}
      <div className="mt-8 space-y-3">
        <form action={signInWith.bind(null, "google")}>
          <ProviderButton label="Continuar con Google" icon={<GoogleIcon />} />
        </form>
        <form action={signInWith.bind(null, "github")}>
          <ProviderButton label="Continuar con GitHub" icon={<GitHubIcon />} />
        </form>
      </div>
    </>
  );
}

function ProviderButton({
  label,
  icon,
}: {
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-xs transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
    >
      {icon}
      {label}
    </button>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="mt-8 space-y-3">
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5 fill-slate-900"
    >
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}
