"use client";

// Top bar: brand + hamburger (mobile only, opens MobileNav) when authenticated, plus user info and
// logout on every authenticated page; brand + Log in/Register when signed out. The role-specific
// nav links that used to live here moved to Sidebar.tsx/MobileNav.tsx (navConfig.ts) so there's one
// nav-item list instead of two.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      router.push("/login");
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {isAuthenticated && onMenuClick && (
            <button
              aria-label="Open menu"
              onClick={onMenuClick}
              className="-ml-1.5 rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:hidden"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path
                  fillRule="evenodd"
                  d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
          <Link href="/" className={`text-sm font-semibold tracking-tight text-slate-900 ${isAuthenticated ? "md:hidden" : ""}`}>
            Weekly Report Generator &amp; Team Dashboard
          </Link>
        </div>

        {!isLoading && (
          <div className="flex items-center gap-3 text-sm">
            {isAuthenticated && user ? (
              <>
                <span className="hidden text-slate-600 sm:inline">{user.name}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                  {user.role === "MANAGER" ? "Manager" : "Team Member"}
                </span>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                >
                  {isLoggingOut ? "Logging out..." : "Log out"}
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-slate-600 hover:text-slate-900">
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
