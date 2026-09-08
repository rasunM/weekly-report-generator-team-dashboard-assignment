// POST /api/review/:reportId/approve and /api/review/:reportId/request-changes - both MANAGER-only
// (review.routes.ts `requireRole("MANAGER")`), and both require the report to currently be
// SUBMITTED server-side (review.service.ts) - a wrong-status call returns a 400 with a clear
// message ("Only SUBMITTED reports can be reviewed..."), surfaced to the user as-is. Both return
// the full, fresh ReportDetail (same shape as GET /reports/:reportId), already including the new
// reviewComments entry - no separate refetch is required after either call.
import { apiRequest } from "./client";
import type { ReportDetail } from "@/types/report";

// `comment` is optional on approve (review.dto.ts) - omit the body entirely rather than sending
// `{ comment: undefined }` when the manager doesn't add one.
export function approveReport(accessToken: string, reportId: string, comment?: string) {
  return apiRequest<ReportDetail>(`/review/${reportId}/approve`, {
    method: "POST",
    body: comment ? { comment } : undefined,
    token: accessToken,
  });
}

// `comment` is required server-side (zod `.min(1)`, "A comment explaining what needs correction is
// required") - the modal also enforces this client-side so the manager sees an inline error
// instead of a round-trip 400.
export function requestChanges(accessToken: string, reportId: string, comment: string) {
  return apiRequest<ReportDetail>(`/review/${reportId}/request-changes`, {
    method: "POST",
    body: { comment },
    token: accessToken,
  });
}
