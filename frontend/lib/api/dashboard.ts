// Manager-only dashboard endpoints - verified against
// backend/src/modules/dashboard/{dashboard.routes,dashboard.controller,dashboard.service}.ts.
// The whole module requires role MANAGER server-side (`router.use(requireAuth,
// requireRole("MANAGER"))`); a MEMBER calling any of these gets a 403 regardless of what the
// frontend does, so ProtectedRoute's allowedRoles gate on the page is UX only, same as everywhere
// else in this app.
import { apiRequest } from "./client";
import type {
  ActivityFeedItem,
  DashboardSummary,
  HoursByTypePoint,
  MemberStatus,
  TasksTrendPoint,
  WorkloadByProjectPoint,
} from "@/types/dashboard";

export function getDashboardSummary(accessToken: string, weekStart?: string) {
  const qs = weekStart ? `?weekStart=${weekStart}` : "";
  return apiRequest<DashboardSummary>(`/dashboard/summary${qs}`, { token: accessToken });
}

export function getTasksTrend(accessToken: string, opts: { weeks?: number; userId?: string } = {}) {
  const params = new URLSearchParams();
  if (opts.weeks !== undefined) params.set("weeks", String(opts.weeks));
  if (opts.userId) params.set("userId", opts.userId);
  const qs = params.toString();
  return apiRequest<TasksTrendPoint[]>(`/dashboard/tasks-trend${qs ? `?${qs}` : ""}`, { token: accessToken });
}

export function getStatusByMember(accessToken: string, weekStart?: string) {
  const qs = weekStart ? `?weekStart=${weekStart}` : "";
  return apiRequest<MemberStatus[]>(`/dashboard/status-by-member${qs}`, { token: accessToken });
}

export function getWorkloadByProject(accessToken: string) {
  return apiRequest<WorkloadByProjectPoint[]>("/dashboard/workload-by-project", { token: accessToken });
}

export function getHoursByType(accessToken: string) {
  return apiRequest<HoursByTypePoint[]>("/dashboard/hours-by-type", { token: accessToken });
}

export function getActivityFeed(accessToken: string, limit?: number) {
  const qs = limit !== undefined ? `?limit=${limit}` : "";
  return apiRequest<ActivityFeedItem[]>(`/dashboard/activity-feed${qs}`, { token: accessToken });
}
