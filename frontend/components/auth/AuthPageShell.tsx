"use client";

// Shared shell for /login and /register: redirects an already-authenticated user away (no reason
// to show them a login form), and renders the given form inside a simple centered card while that
// check is running or once it's clear the form should show.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { roleHomePath } from "@/lib/auth/roleHome";
import LoadingSpinner from "@/components/common/LoadingSpinner";

export default function AuthPageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(roleHomePath(role));
    }
  }, [isLoading, isAuthenticated, role, router]);

  if (isLoading || isAuthenticated) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
