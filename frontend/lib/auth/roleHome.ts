// Where a given role lands after login/register, or when visiting an auth page while already
// signed in. Centralized so login, register, and the auth-page redirect guard all agree.
import type { Role } from "@/types/auth";

export function roleHomePath(role: Role | null): string {
  if (role === "MEMBER") return "/dashboard";
  if (role === "MANAGER") return "/manager/dashboard";
  return "/";
}
