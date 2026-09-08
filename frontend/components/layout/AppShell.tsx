"use client";

// Top-level page shell: sidebar (md+) + top bar + mobile drawer when signed in; just the top bar
// (its own signed-out state) when not. Replaces the previous bare <Header /> in app/layout.tsx.
// Purely structural/presentational - no auth logic lives here beyond reading isAuthenticated to
// decide whether to render the sidebar/drawer at all.
import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import Header from "./Header";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-full flex-1 flex-col">
        <Header />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1">
      <Sidebar />
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
