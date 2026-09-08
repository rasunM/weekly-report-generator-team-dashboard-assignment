// Mirrors the backend's actual response shapes exactly - see
// backend/src/modules/reports/reports.service.ts (`summarize()` for list items, `getById()` for
// detail) and backend/src/modules/reports/reports.dto.ts (status enum, query filters).
export type ReportStatus = "DRAFT" | "SUBMITTED" | "NEEDS_CORRECTION" | "APPROVED";

export interface ReportProjectRef {
  id: string;
  name: string;
}

export interface ReportUserRef {
  id: string;
  name: string;
  email: string;
}

// GET /api/reports item shape (reports.service.ts `summarize()`).
export interface ReportSummary {
  id: string;
  status: ReportStatus;
  weekStart: string; // ISO date string
  weekEnd: string;
  updatedAt: string;
  project: ReportProjectRef | null;
  user?: ReportUserRef; // only present in the manager's team-wide listing
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: Pagination;
}

export interface TaskEntry {
  taskName: string;
  priority: string;
  plannedPct: number;
  actualPct: number;
  status: string;
  timePlannedHrs?: number;
  timeSpentHrs?: number;
  deliverable?: string;
}

export interface FlaggableEntry {
  text: string;
  isKey: boolean;
}

export type HourType = "DEVELOPMENT" | "TESTING" | "MEETINGS" | "DOCUMENTATION" | "OTHER";

export interface HoursEntry {
  type: HourType;
  hours: number;
}

export interface ReportContent {
  tasksCompleted: TaskEntry[];
  tasksPlannedNextWeek: string[];
  blockers: FlaggableEntry[];
  achievements: FlaggableEntry[];
  hoursByType: HoursEntry[];
  notes?: string;
}

export interface ReportVersion {
  id: string;
  versionNumber: number;
  submittedAt: string | null;
  content: ReportContent;
}

export interface VersionHistoryEntry {
  id: string;
  versionNumber: number;
  submittedAt: string | null;
  createdAt: string;
}

// GET /api/reports/:reportId/versions/:versionNumber response shape (reports.service.ts
// `getVersion()`) - a full immutable content snapshot for one version. Deliberately separate from
// `ReportVersion` (the shape embedded as `currentVersion` on a report detail, which has no
// `createdAt`) rather than widening that type to match a response the detail endpoint doesn't
// actually return.
export interface ReportVersionDetail {
  id: string;
  versionNumber: number;
  submittedAt: string | null;
  createdAt: string;
  content: ReportContent;
}

export type ReviewAction = "APPROVED" | "REQUEST_CHANGES";

export interface ReviewComment {
  id: string;
  action: ReviewAction;
  comment: string;
  createdAt: string;
  reportVersionId: string;
  reviewer: { id: string; name: string };
}

// GET /api/reports/:reportId shape (reports.service.ts `getById()`).
export interface ReportDetail {
  id: string;
  status: ReportStatus;
  weekStart: string;
  weekEnd: string;
  createdAt: string;
  updatedAt: string;
  user: ReportUserRef;
  project: ReportProjectRef | null;
  currentVersion: ReportVersion | null;
  versionHistory: VersionHistoryEntry[];
  reviewComments: ReviewComment[];
}

export interface ListReportsQuery {
  page?: number;
  pageSize?: number;
  status?: ReportStatus;
  projectId?: string;
  weekStart?: string;
  weekEnd?: string;
  /** Manager-only filter (reports.dto.ts) - ignored server-side when the caller is a MEMBER. */
  userId?: string;
}

// Mirrors backend/src/modules/reports/reports.dto.ts exactly.
// NOTE the asymmetry: createReportSchema's projectId is `.optional()` (no `.nullable()`) - sending
// `null` on create fails validation, you must omit the key entirely. updateReportSchema's projectId
// is `.nullable().optional()` - `null` explicitly clears a previously-set project, `undefined`
// leaves it unchanged. See lib/api/reports.ts for how the two payloads are built differently.
export interface CreateReportInput {
  weekStart: string;
  weekEnd: string;
  projectId?: string;
  content?: ReportContent;
}

export interface UpdateReportInput {
  weekStart?: string;
  weekEnd?: string;
  projectId?: string | null;
  content: ReportContent;
}
