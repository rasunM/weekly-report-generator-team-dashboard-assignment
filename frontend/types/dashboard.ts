// Mirrors backend/src/modules/dashboard/dashboard.service.ts response shapes exactly - each
// function's comment there names which manager-dashboard requirement it backs.
import type { HourType, ReportStatus } from "./report";

export interface ComplianceRate {
  submitted: number;
  pending: number;
  late: number;
  totalMembers: number;
  ratePct: number;
}

// GET /api/dashboard/summary
export interface DashboardSummary {
  weekStart: string;
  weekEnd: string;
  totalReportsSubmittedThisWeek: number;
  complianceRate: ComplianceRate;
  needsCorrectionCount: number;
  openBlockersCount: number;
}

// GET /api/dashboard/tasks-trend
export interface TasksTrendPoint {
  weekStart: string;
  tasksCompleted: number;
}

// GET /api/dashboard/status-by-member - "NOT_STARTED" is synthesized server-side for a member with
// no report for the given week (dashboard.service.ts `getStatusByMember()`); it is NOT one of the
// real ReportStatus enum values and can never be used as a filter on GET /api/reports.
export type MemberDisplayStatus = ReportStatus | "NOT_STARTED";

export interface MemberStatus {
  userId: string;
  name: string;
  status: MemberDisplayStatus;
}

// GET /api/dashboard/workload-by-project
export interface WorkloadByProjectPoint {
  projectId: string | null;
  projectName: string;
  taskCount: number;
}

// GET /api/dashboard/hours-by-type
export interface HoursByTypePoint {
  type: HourType;
  totalHours: number;
}

// GET /api/dashboard/activity-feed - a merged, reverse-chronological feed of report submissions and
// review actions (dashboard.service.ts `getActivityFeed()`). Only APPROVED/REQUEST_CHANGES items
// carry a comment.
export type ActivityFeedItem =
  | { type: "SUBMITTED"; occurredAt: string; reportId: string; actor: { id: string; name: string } }
  | {
      type: "APPROVED" | "REQUEST_CHANGES";
      occurredAt: string;
      reportId: string;
      actor: { id: string; name: string };
      comment: string;
    };
