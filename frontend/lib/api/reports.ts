// Read-only calls used by the Team Member dashboard - verified against
// backend/src/modules/reports/{reports.routes,reports.controller,reports.service}.ts.
// GET /api/reports self-scopes by the caller's role server-side (reports.controller.ts `list()`):
// a MEMBER always gets only their own reports here, never anyone else's, regardless of any query
// param sent - so no extra "mine only" filter is needed on the frontend.
import { apiRequest } from "./client";
import type {
  CreateReportInput,
  ListReportsQuery,
  PaginatedResult,
  ReportDetail,
  ReportSummary,
  ReportVersionDetail,
  UpdateReportInput,
} from "@/types/report";

function toQueryString(query: ListReportsQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function listReports(accessToken: string, query: ListReportsQuery = {}) {
  return apiRequest<PaginatedResult<ReportSummary>>(`/reports${toQueryString(query)}`, {
    token: accessToken,
  });
}

export function getReport(accessToken: string, reportId: string) {
  return apiRequest<ReportDetail>(`/reports/${reportId}`, { token: accessToken });
}

// GET /api/reports/:reportId/versions/:versionNumber - returns one immutable past (or current)
// content snapshot (reports.service.ts `getVersion()`). Same access rule as GET /reports/:reportId
// (assertAccess: a member must own the report; a manager can view any). Used by the Version
// History section on the Manager Review page (Feature 10) to lazy-load a previous version's
// content only when the manager clicks "View" - never fetched upfront for every version.
export function getReportVersion(accessToken: string, reportId: string, versionNumber: number) {
  return apiRequest<ReportVersionDetail>(`/reports/${reportId}/versions/${versionNumber}`, { token: accessToken });
}

// POST /api/reports - MEMBER only (reports.routes.ts). Creates a new report in DRAFT status.
// weekStart/weekEnd/projectId form a uniqueness key server-side (one report per user+week+project) -
// a duplicate throws 409 CONFLICT, surfaced to the user as-is (see ReportForm.tsx).
export function createReport(accessToken: string, input: CreateReportInput) {
  return apiRequest<ReportDetail>("/reports", { method: "POST", body: input, token: accessToken });
}

// PATCH /api/reports/:reportId - MEMBER only, and only while the report is DRAFT or
// NEEDS_CORRECTION (reports.service.ts `update()`). `content` is required on every call (unlike
// create, where it's optional) - the backend DTO has no `.optional()` on it.
export function updateReport(accessToken: string, reportId: string, input: UpdateReportInput) {
  return apiRequest<ReportDetail>(`/reports/${reportId}`, { method: "PATCH", body: input, token: accessToken });
}

// POST /api/reports/:reportId/submit - MEMBER only, no body. DRAFT/NEEDS_CORRECTION -> SUBMITTED.
export function submitReport(accessToken: string, reportId: string) {
  return apiRequest<ReportDetail>(`/reports/${reportId}/submit`, { method: "POST", token: accessToken });
}
