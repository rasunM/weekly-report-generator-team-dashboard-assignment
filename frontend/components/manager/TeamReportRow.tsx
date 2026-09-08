import Link from "next/link";
import type { ReportSummary } from "@/types/report";
import { formatWeekRange, formatDateTime } from "@/lib/format";
import StatusBadge from "@/components/common/StatusBadge";

// Like ReportHistoryRow but includes the team member's name (the manager's list spans the whole
// team, not just one person) and links to the Manager Review page (/manager/reports/[id]/review,
// Feature 9) - the complete report in read-only mode, plus Approve/Request Changes actions when
// the report is SUBMITTED. A manager can never edit report content directly from here or there.
// The member's name itself links to their profile (/manager/team/[id], Feature 13) - the "select a
// team member" entry point.
export default function TeamReportRow({ report }: { report: ReportSummary }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-6">
        {report.user ? (
          <Link href={`/manager/team/${report.user.id}`} className="text-sm font-medium text-slate-900 hover:underline sm:w-36">
            {report.user.name}
          </Link>
        ) : (
          <span className="text-sm font-medium text-slate-900 sm:w-36">Unknown</span>
        )}
        <span className="text-sm text-slate-600 sm:w-40">{formatWeekRange(report.weekStart, report.weekEnd)}</span>
        <span className="text-sm text-slate-600 sm:w-36">{report.project?.name ?? "No project"}</span>
        <span className="text-xs text-slate-400">Updated {formatDateTime(report.updatedAt)}</span>
      </div>
      <div className="flex items-center gap-4">
        <StatusBadge status={report.status} />
        <Link href={`/manager/reports/${report.id}/review`} className="text-sm font-medium text-slate-900 hover:underline">
          View &rarr;
        </Link>
      </div>
    </div>
  );
}
