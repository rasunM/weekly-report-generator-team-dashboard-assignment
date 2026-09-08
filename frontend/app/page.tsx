"use client";

import Link from "next/link";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth/AuthContext";

export default function Home() {
  return (
    <ProtectedRoute>
      <HomeContent />
    </ProtectedRoute>
  );
}

function HomeContent() {
  const { user } = useAuth();

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Welcome, {user?.name}</h1>
        <p className="mt-2 text-sm text-slate-500">
          You&apos;re signed in as{" "}
          <span className="font-medium text-slate-700">
            {user?.role === "MANAGER" ? "Manager" : "Team Member"}
          </span>
          .
        </p>
        <Link
          href={user?.role === "MANAGER" ? "/manager/dashboard" : "/dashboard"}
          className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Go to your dashboard
        </Link>
      </div>
    </div>
  );
}
