"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth/AuthContext";
import { useEffect, useState } from "react";
import { listReports, getReport } from "@/lib/api/reports";
import { ApiError } from "@/lib/api/client";
import { currentWeekStartDateOnly, toDateOnly } from "@/lib/week";
import { formatDateTime } from "@/lib/format";
import type { ReportSummary } from "@/types/report";
import DashboardCard from "@/components/common/DashboardCard";
import EmptyState from "@/components/common/EmptyState";
import StatusBadge from "@/components/common/StatusBadge";
import ErrorMessage from "@/components/common/ErrorMessage";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import Button from "@/components/common/Button";
import Link from "next/link";
import ReportCard from "@/components/reports/ReportCard";
import PageHeader from "@/components/common/PageHeader";

export default function DashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["MEMBER"]}>
      <DashboardContent />
    </ProtectedRoute>
  );
}

interface CorrectionComment {
  comment: string;
  reviewerName: string;
  createdAt: string;
}

interface DashboardData {
  currentWeekReport: ReportSummary | null;
  recentReports: ReportSummary[];
  needsCorrectionReports: ReportSummary[];
  latestCorrectionComment: CorrectionComment | null;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: DashboardData };

function DashboardContent() {
  const { user, accessToken } = useAuth();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    async function load() {
      setState({ status: "loading" });
      try {
        // Two targeted queries rather than one big list: "recent" (unfiltered, most recent first -
        // reports.service.ts listForUser orders by weekStart desc) and "needs correction" (server-
        // side status filter, so it's correct regardless of how many other reports exist in between).
        const [recentResult, needsCorrectionResult] = await Promise.all([
          listReports(accessToken as string, { pageSize: 5 }),
          listReports(accessToken as string, { status: "NEEDS_CORRECTION", pageSize: 5 }),
        ]);
        if (cancelled) return;

        const thisWeekStart = currentWeekStartDateOnly();
        const currentWeekReport =
          recentResult.items.find((r) => toDateOnly(r.weekStart) === thisWeekStart) ?? null;

        let latestCorrectionComment: CorrectionComment | null = null;
        const mostRecentNeedsCorrection = needsCorrectionResult.items[0];
        if (mostRecentNeedsCorrection) {
          // Fetch the full report to get its review comments (the list endpoint doesn't include
          // them - see reports.service.ts `summarize()` vs `getById()`).
          const detail = await getReport(accessToken as string, mostRecentNeedsCorrection.id);
          const latest =
            detail.reviewComments.find((c) => c.action === "REQUEST_CHANGES") ?? detail.reviewComments[0];
          if (latest) {
            latestCorrectionComment = {
              comment: latest.comment,
              reviewerName: latest.reviewer.name,
              createdAt: latest.createdAt,
            };
          }
        }

        if (cancelled) return;
        setState({
          status: "ready",
          data: {
            currentWeekReport,
            recentReports: recentResult.items,
            needsCorrectionReports: needsCorrectionResult.items,
            latestCorrectionComment,
          },
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          status: "error",
          message: err instanceof ApiError ? err.message : "Something went wrong loading your dashboard.",
        });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, retryKey]);

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader title={`Welcome back, ${user?.name}`} subtitle={user?.email} />

      {state.status === "loading" && <LoadingSpinner label="Loading your dashboard..." />}

      {state.status === "error" && (
        <div className="flex flex-col items-start gap-3">
          <ErrorMessage message={state.message} />
          <Button variant="secondary" onClick={() => setRetryKey((k) => k + 1)}>
            Retry
          </Button>
        </div>
      )}

      {state.status === "ready" && (
        <div className="flex flex-col gap-6">
          <DashboardCard
            title="This Week's Report"
            action={
              !state.data.currentWeekReport && (
                <Link
                  href="/reports/new"
                  className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Create this week's report
                </Link>
              )
            }
          >
            {state.data.currentWeekReport ? (
              <Link
                href={`/reports/${state.data.currentWeekReport.id}`}
                className="flex items-center justify-between rounded-md -mx-2 -my-1 px-2 py-1 transition-colors hover:bg-slate-50"
              >
                <span className="text-sm text-slate-600">
                  Week of {new Date(state.data.currentWeekReport.weekStart).toLocaleDateString(undefined, { timeZone: "UTC", month: "short", day: "numeric" })}
                </span>
                <StatusBadge status={state.data.currentWeekReport.status} />
              </Link>
            ) : (
              <EmptyState message="You haven't started this week's report yet." />
            )}
          </DashboardCard>

          <DashboardCard title="Reports Needing Correction">
            {state.data.needsCorrectionReports.length === 0 ? (
              <EmptyState message="Nothing needs correction right now." />
            ) : (
              <div className="flex flex-col gap-3">
                {state.data.needsCorrectionReports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))}
                {state.data.latestCorrectionComment && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-xs font-medium text-amber-800">
                      Manager feedback from {state.data.latestCorrectionComment.reviewerName} &middot;{" "}
                      {formatDateTime(state.data.latestCorrectionComment.createdAt)}
                    </p>
                    <p className="mt-1 text-sm text-amber-900">{state.data.latestCorrectionComment.comment}</p>
                  </div>
                )}
              </div>
            )}
          </DashboardCard>

          <DashboardCard
            title="Recent Reports"
            action={
              <Link href="/reports/history" className="text-xs font-medium text-slate-500 hover:text-slate-900 hover:underline">
                View all
              </Link>
            }
          >
            {state.data.recentReports.length === 0 ? (
              <EmptyState message="No reports yet." />
            ) : (
              <div className="flex flex-col gap-3">
                {state.data.recentReports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </div>
            )}
          </DashboardCard>
        </div>
      )}
    </div>
  );
}
