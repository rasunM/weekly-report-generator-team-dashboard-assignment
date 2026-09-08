// Mirrors the backend's actual response shapes (src/modules/auth/auth.service.ts `toSafeUser`,
// src/modules/auth/auth.dto.ts). Do not add fields the API doesn't return.
import type { ReportStatus, ReportSummary } from "./report";

export type Role = "MEMBER" | "MANAGER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

// Mirrors backend/src/modules/users/users.dto.ts exactly - all manager-only user-management calls
// (users.routes.ts `requireRole("MANAGER")`).
export interface ListUsersQuery {
  page?: number;
  pageSize?: number;
  role?: Role;
  /** Matches against name OR email, case-insensitive `contains` (users.service.ts `list()`). */
  search?: string;
}

// POST /api/users - NOTE this is not a real invite-email flow: the manager sets a temporary
// password directly and the account is created immediately as active (users.dto.ts comment).
// `role` defaults to MEMBER server-side if omitted.
export interface InviteUserInput {
  name: string;
  email: string;
  role?: Role;
  temporaryPassword: string;
}

// GET /api/users/:userId/profile response (users.service.ts `getProfileWithStats()`) - manager-
// only, works for any user id. `byStatus` is an object keyed by ReportStatus, only present for
// statuses that occur at least once (not every key is guaranteed present). `reports` is the
// member's COMPLETE report history (no pagination/slicing server-side), sorted by weekStart desc.
export interface UserProfile {
  user: User;
  stats: {
    totalReports: number;
    byStatus: Partial<Record<ReportStatus, number>>;
  };
  reports: ReportSummary[];
}
