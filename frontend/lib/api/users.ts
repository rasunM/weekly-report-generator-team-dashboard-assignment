// users module - all manager-only except GET /users/me (used by AuthContext, not here). Verified
// against backend/src/modules/users/{users.routes,users.controller,users.service,users.dto}.ts.
import { apiRequest } from "./client";
import type { PaginatedResult } from "@/types/report";
import type { InviteUserInput, ListUsersQuery, Role, User, UserProfile } from "@/types/auth";

function toQueryString(query: ListUsersQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

// Used elsewhere (e.g. the manager dashboard's "Team member" filter) to fetch every MEMBER in one
// call - kept separate from the paginated `listUsers` below, which is the /users management page's
// own general-purpose listing (any role, real pagination/search).
export function listTeamMembers(accessToken: string, role: Role = "MEMBER") {
  return apiRequest<PaginatedResult<User>>(`/users?role=${role}&pageSize=100`, { token: accessToken });
}

// GET /api/users - manager-only. Real server-side pagination, role filter, and name/email search
// (users.service.ts `list()` - `search` matches name OR email via a case-insensitive `contains`).
export function listUsers(accessToken: string, query: ListUsersQuery = {}) {
  return apiRequest<PaginatedResult<User>>(`/users${toQueryString({ pageSize: 50, ...query })}`, { token: accessToken });
}

// POST /api/users - manager-only. Duplicate email -> 409, surfaced to the caller as-is.
export function inviteUser(accessToken: string, input: InviteUserInput) {
  return apiRequest<User>("/users", { method: "POST", body: input, token: accessToken });
}

// GET /api/users/:userId/profile - manager-only (Feature 13). Returns the member's full report
// history + status counts in one call - not paginated server-side (users.service.ts
// `getProfileWithStats()` has no `take`/`skip`), so any "recent vs full history" split is done
// client-side against this one response.
export function getUserProfile(accessToken: string, userId: string) {
  return apiRequest<UserProfile>(`/users/${userId}/profile`, { token: accessToken });
}

// PATCH /api/users/:userId/role - manager-only, body is just `{ role }`. Backend has no
// self-demotion or last-manager guard (users.service.ts) - the frontend adds its own safety rail
// (disabling this for the signed-in manager's own row) rather than relying on a server-side check
// that doesn't exist.
export function changeUserRole(accessToken: string, userId: string, role: Role) {
  return apiRequest<User>(`/users/${userId}/role`, { method: "PATCH", body: { role }, token: accessToken });
}

// DELETE /api/users/:userId - manager-only. A REAL hard delete (users.service.ts `prisma.user.
// delete`), not a deactivation - `User` has no isActive/isDeleted field. Cascades to that user's
// reports/versions/hours entries and refresh tokens (schema.prisma onDelete: Cascade). Backend
// blocks deleting your own account (400); the frontend also disables this for your own row.
// Returns 204 (no body).
export function removeUser(accessToken: string, userId: string) {
  return apiRequest<null>(`/users/${userId}`, { method: "DELETE", token: accessToken });
}
