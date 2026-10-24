import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/lib/domain";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: UserRole } & DefaultSession["user"];
  }
}

// next-auth/jwt reexporta el tipo desde @auth/core/jwt: se extiende en el origen.
declare module "@auth/core/jwt" {
  interface JWT {
    role?: UserRole;
  }
}
