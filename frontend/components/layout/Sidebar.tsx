"use client";

// Persistent left sidebar for md+ screens. Same nav items as the mobile drawer (navConfig.ts) -
// this component owns only the desktop presentation, none of the link list itself.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { getNavItems, isNavItemActive } from "./navConfig";

export default function Sidebar() {
  const { role } = useAuth();
  const pathname = usePathname();
  const items = getNavItems(role);

  return (
    <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
      <div className="flex h-14 items-center border-b border-slate-200 px-5">
        <Link href="/" className="text-sm font-semibold tracking-tight text-slate-900">
          Weekly Reports
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {items.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
