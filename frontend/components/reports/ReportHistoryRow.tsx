import Link from "next/link";
import type { ReportSummary } from "@/types/report";
import { formatWeekRange, formatDateTime } from "@/lib/format";
import StatusBadge from "@/components/common/StatusBadge";

// One row of the report history list: Week / Project / Status / Updated / Action, per Feature 5's
// column spec. Links to the read-only report detail view (/reports/[id]).
export default function ReportHistoryRow({ report }: { report: ReportSummary }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-6">
        <span className="text-sm font-medium text-slate-900 sm:w-44">
          {formatWeekRange(report.weekStart, report.weekEnd)}
        </span>
        <span className="text-sm text-slate-600 sm:w-40">{report.project?.name ?? "No project"}</span>
        <span className="text-xs text-slate-400">Updated {formatDateTime(report.updatedAt)}</span>
      </div>
      <div className="flex items-center gap-4">
        <StatusBadge status={report.status} />
        <Link href={`/reports/${report.id}`} className="text-sm font-medium text-slate-900 hover:underline">
          View &rarr;
        </Link>
      </div>
    </div>
  );
}
