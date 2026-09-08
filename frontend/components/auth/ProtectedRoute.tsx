"use client";

// Client-side route guard. The backend has no cookies to check server-side (see AuthContext.tsx
// comment on the bearer-token-only session model), so route protection has to happen after the
// client has loaded and AuthContext has verified whatever session was in localStorage. This is a
// UX convenience only, not a security boundary - the backend independently rejects any request
// without a valid token/role regardless of what this component does (assignment section 23).
//
// `allowedRoles` adds a role gate on top of plain authentication (e.g. /dashboard is a Team Member
// page - a MANAGER visiting it is redirected to "/" instead of seeing a page built around "your own
// reports" semantics that don't apply to their account). Same caveat: this only controls what the
// frontend *renders*, never what the backend will *do* - every API call the page makes is still
// independently authorized server-side.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import type { Role } from "@/types/auth";

export default function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: Role[];
}) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const router = useRouter();

  const roleAllowed = !allowedRoles || (role !== null && allowedRoles.includes(role));

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
    } else if (!roleAllowed) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, roleAllowed, router]);

  if (isLoading || !isAuthenticated || !roleAllowed) {
    return <LoadingSpinner label="Checking your session..." />;
  }

  return <>{children}</>;
}
