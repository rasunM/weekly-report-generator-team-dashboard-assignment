import Link from "next/link";
import type { ReportSummary } from "@/types/report";
import { formatWeekRange, formatDateTime } from "@/lib/format";
import StatusBadge from "@/components/common/StatusBadge";

// Every report links to its read-only detail view (/reports/[id]) - editing happens from there
// via that page's own Edit button, only shown when the status allows it.
export default function ReportCard({ report }: { report: ReportSummary }) {
  return (
    <Link
      href={`/reports/${report.id}`}
      className="flex items-center justify-between gap-4 rounded-md border border-slate-100 px-4 py-3 transition-colors hover:border-slate-300 hover:bg-slate-50"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">{formatWeekRange(report.weekStart, report.weekEnd)}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {report.project?.name ?? "No project"} &middot; Updated {formatDateTime(report.updatedAt)}
        </p>
      </div>
      <StatusBadge status={report.status} />
    </Link>
  );
}
