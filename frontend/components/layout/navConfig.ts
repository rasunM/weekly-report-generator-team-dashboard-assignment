// Single source of truth for the app's nav items, shared by the desktop Sidebar and the mobile
// drawer so they can never drift out of sync. Mirrors exactly what Header.tsx used to render
// inline per-role - no new destinations, just centralized.
import type { Role } from "@/types/auth";

export interface NavItem {
  href: string;
  label: string;
}

const MEMBER_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/reports/new", label: "New Report" },
  { href: "/reports/history", label: "History" },
];

const MANAGER_ITEMS: NavItem[] = [
  { href: "/manager/dashboard", label: "Manager Dashboard" },
  { href: "/manager/reports", label: "Team Reports" },
  { href: "/users", label: "Team Members" },
];

// GET /api/projects is open to any authenticated role, so this item is shared by both roles
// (appended after the role-specific items, matching Header.tsx's previous ordering).
const SHARED_ITEMS: NavItem[] = [{ href: "/projects", label: "Projects" }];

export function getNavItems(role: Role | null): NavItem[] {
  if (role === "MEMBER") return [...MEMBER_ITEMS, ...SHARED_ITEMS];
  if (role === "MANAGER") return [...MANAGER_ITEMS, ...SHARED_ITEMS];
  return [];
}

// Active-state check: exact match, or the current path is a sub-route of the nav item (e.g.
// /manager/reports/abc123/review should still highlight "Team Reports"). "/" is never treated as a
// prefix match for anything since every real href is more specific than that.
export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
