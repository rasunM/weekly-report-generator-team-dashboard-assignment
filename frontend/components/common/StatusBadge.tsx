import type { MemberDisplayStatus } from "@/types/dashboard";

const STYLES: Record<MemberDisplayStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SUBMITTED: "bg-blue-50 text-blue-700",
  NEEDS_CORRECTION: "bg-amber-50 text-amber-700",
  APPROVED: "bg-green-50 text-green-700",
  NOT_STARTED: "bg-slate-50 text-slate-400",
};

const LABELS: Record<MemberDisplayStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  NEEDS_CORRECTION: "Needs Correction",
  APPROVED: "Approved",
  NOT_STARTED: "Not Started",
};

// Accepts the real ReportStatus enum plus the manager dashboard's synthetic "NOT_STARTED" value
// (see types/dashboard.ts) - every other usage in the app only ever passes a real ReportStatus, so
// this is a superset, not a behavior change for existing callers.
export default function StatusBadge({ status }: { status: MemberDisplayStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
