"use client";

// Team Member Profile (Feature 13): GET /api/users/:userId/profile in one call gives basic info,
// status counts, and the member's complete report history - reused here across three sections
// rather than three separate fetches. Entirely read-only: nothing on this page can modify report
// content, only navigate to the existing read-only report views.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { getUserProfile } from "@/lib/api/users";
import { ApiError } from "@/lib/api/client";
import { formatDate } from "@/lib/format";
import type { UserProfile } from "@/types/auth";
import DashboardCard from "@/components/common/DashboardCard";
import StatCard from "@/components/common/StatCard";
import ReportHistoryRow from "@/components/reports/ReportHistoryRow";
import Pagination from "@/components/common/Pagination";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ErrorMessage from "@/components/common/ErrorMessage";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/common/Button";

const RECENT_COUNT = 5;
const HISTORY_PAGE_SIZE = 10;

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: UserProfile };

export default function TeamMemberProfile({ userId }: { userId: string }) {
  const { accessToken } = useAuth();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setState({ status: "loading" });
    getUserProfile(accessToken, userId)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof ApiError ? err.message : "Could not load this team member's profile.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, userId, retryKey]);

  if (state.status === "loading") {
    return <LoadingSpinner label="Loading team member profile..." />;
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <ErrorMessage message={state.message} />
        <div className="mt-4 flex items-center gap-3">
          <Button variant="secondary" onClick={() => setRetryKey((k) => k + 1)}>
            Retry
          </Button>
          <Link href="/manager/reports" className="text-sm font-medium text-slate-900 hover:underline">
            Back to Team Reports
          </Link>
        </div>
      </div>
    );
  }

  const { user, stats, reports } = state.data;
  const recent = reports.slice(0, RECENT_COUNT);
  const historyTotalPages = Math.max(1, Math.ceil(reports.length / HISTORY_PAGE_SIZE));
  const historyPageItems = reports.slice((historyPage - 1) * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE);

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <Link href="/manager/reports" className="text-xs font-medium text-slate-500 hover:text-slate-900 hover:underline">
        &larr; Back to Team Reports
      </Link>

      <div className="mb-6 mt-2">
        <h1 className="text-xl font-semibold text-slate-900">{user.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {user.email} &middot; {user.role === "MANAGER" ? "Manager" : "Team Member"} &middot; Joined {formatDate(user.createdAt)}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Reports" value={String(stats.totalReports)} />
        <StatCard label="Approved" value={String(stats.byStatus.APPROVED ?? 0)} />
        <StatCard label="Submitted" value={String(stats.byStatus.SUBMITTED ?? 0)} />
        <StatCard label="Needs Correction" value={String(stats.byStatus.NEEDS_CORRECTION ?? 0)} />
      </div>

      <div className="mb-6">
        <DashboardCard title="Recent Reports">
          {recent.length === 0 ? (
            <EmptyState message="No reports yet." />
          ) : (
            <div className="flex flex-col gap-3">
              {recent.map((report) => (
                <ReportHistoryRow key={report.id} report={report} />
              ))}
            </div>
          )}
        </DashboardCard>
      </div>

      <DashboardCard title="Report History">
        {reports.length === 0 ? (
          <EmptyState message="This team member hasn't created any reports yet." />
        ) : (
          <div className="flex flex-col gap-3">
            {historyPageItems.map((report) => (
              <ReportHistoryRow key={report.id} report={report} />
            ))}
            <Pagination page={historyPage} totalPages={historyTotalPages} onPageChange={setHistoryPage} />
          </div>
        )}
      </DashboardCard>
    </div>
  );
}
