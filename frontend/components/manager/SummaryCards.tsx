import type { DashboardSummary } from "@/types/dashboard";
import StatCard from "@/components/common/StatCard";

// All four numbers come straight from GET /api/dashboard/summary (dashboard.service.ts
// `getSummary()`) - nothing here is computed or hardcoded on the frontend.
export default function SummaryCards({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Submitted This Week"
        value={String(summary.totalReportsSubmittedThisWeek)}
        sub={`of ${summary.complianceRate.totalMembers} team members`}
      />
      <StatCard
        label="Compliance Rate"
        value={`${summary.complianceRate.ratePct}%`}
        sub={`${summary.complianceRate.pending} pending, ${summary.complianceRate.late} late`}
      />
      <StatCard label="Needs Correction" value={String(summary.needsCorrectionCount)} />
      <StatCard label="Open Blockers" value={String(summary.openBlockersCount)} />
    </div>
  );
}
