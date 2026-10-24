import type { UserRole } from "@/lib/domain";

/** ADMIN y OPERATOR pueden crear, editar y eliminar; VIEWER solo consulta. */
export function canMutate(role: UserRole | undefined): boolean {
  return role === "ADMIN" || role === "OPERATOR";
}
