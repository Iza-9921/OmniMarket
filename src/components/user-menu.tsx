import Image from "next/image";
import { USER_ROLE_LABELS } from "@/lib/domain";
import { signOut } from "@/server/auth";
import { requireUser } from "@/server/auth/session";
import { Skeleton } from "@/components/ui/skeleton";

// Lee la sesión: debe renderizarse dentro de un <Suspense> (Cache Components).
export async function UserMenu() {
  const user = await requireUser();
  const displayName = user.name ?? user.email ?? "Usuario";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p
          className="text-sm font-medium text-slate-900"
          data-testid="user-name"
        >
          {displayName}
        </p>
        <p className="text-xs text-slate-500" data-testid="user-role">
          {USER_ROLE_LABELS[user.role]}
        </p>
      </div>
      {user.image ? (
        <Image
          src={user.image}
          alt=""
          width={36}
          height={36}
          className="size-9 rounded-full border border-slate-200"
        />
      ) : (
        <span
          aria-hidden="true"
          className="grid size-9 place-items-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700"
        >
          {initials}
        </span>
      )}
      <form action={logout}>
        <button
          type="submit"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}

export function UserMenuSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <div className="hidden space-y-1.5 sm:block">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="ml-auto h-3 w-16" />
      </div>
      <Skeleton className="size-9 rounded-full" />
      <Skeleton className="h-8 w-28" />
    </div>
  );
}
