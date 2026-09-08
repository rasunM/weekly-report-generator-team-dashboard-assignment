"use client";

// Manager Review page (Feature 9): the complete report in read-only mode plus the two review
// actions. Reuses ReportContentSections (Feature 6) for the body so the manager sees exactly the
// same report the team member submitted - there is no editable form anywhere on this page; the
// manager can never modify report content, only its status via the two review endpoints below.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { getReport } from "@/lib/api/reports";
import { approveReport, requestChanges } from "@/lib/api/review";
import { ApiError } from "@/lib/api/client";
import { formatWeekRange, formatDateTime } from "@/lib/format";
import type { ReportDetail as ReportDetailData } from "@/types/report";
import ReportContentSections from "@/components/reports/ReportContentSections";
import RequestChangesModal from "./RequestChangesModal";
import VersionHistorySection from "./VersionHistorySection";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ErrorMessage from "@/components/common/ErrorMessage";
import Button from "@/components/common/Button";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ReportDetailData };

export default function ManagerReviewDetail({ reportId }: { reportId: string }) {
  const { accessToken } = useAuth();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);
  const [isApproving, setIsApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [showRequestChanges, setShowRequestChanges] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setState({ status: "loading" });
    getReport(accessToken, reportId)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof ApiError ? err.message : "Could not load this report.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, reportId, retryKey]);

  async function handleApprove() {
    if (!accessToken) return;
    setApproveError(null);
    setIsApproving(true);
    try {
      // Response is already the fresh, full report detail (status: APPROVED, new reviewComments
      // entry included) - no separate refetch needed, matching the "refresh the report state"
      // pattern used after submit in Feature 4.
      const updated = await approveReport(accessToken, reportId);
      setState({ status: "ready", data: updated });
    } catch (err) {
      setApproveError(err instanceof ApiError ? err.message : "Could not approve this report.");
    } finally {
      setIsApproving(false);
    }
  }

  async function handleRequestChanges(comment: string) {
    if (!accessToken) return;
    const updated = await requestChanges(accessToken, reportId, comment);
    setState({ status: "ready", data: updated });
    setShowRequestChanges(false);
  }

  if (state.status === "loading") {
    return <LoadingSpinner label="Loading report..." />;
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <ErrorMessage message={state.message} />
        <Link href="/manager/reports" className="mt-4 inline-block text-sm font-medium text-slate-900 hover:underline">
          Back to Team Reports
        </Link>
      </div>
    );
  }

  const report = state.data;
  const content = report.currentVersion?.content ?? null;
  const isReviewable = report.status === "SUBMITTED";
  const latestCorrection = report.reviewComments.find((c) => c.action === "REQUEST_CHANGES") ?? null;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <Link href="/manager/reports" className="text-xs font-medium text-slate-500 hover:text-slate-900 hover:underline">
        &larr; Back to Team Reports
      </Link>

      <div className="mb-6 mt-2 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Weekly Report</h1>
          <p className="mt-1 text-sm text-slate-500">
            {formatWeekRange(report.weekStart, report.weekEnd)} &middot; {report.user.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={report.status} />
          {isReviewable && (
            <>
              <Button variant="secondary" onClick={() => setShowRequestChanges(true)} disabled={isApproving}>
                Request Changes
              </Button>
              <Button onClick={handleApprove} isLoading={isApproving}>
                Approve Report
              </Button>
            </>
          )}
        </div>
      </div>

      {!isReviewable && (
        <div className="mb-6 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {report.status === "APPROVED"
            ? "This report has been approved - no further action is needed."
            : report.status === "NEEDS_CORRECTION"
              ? "This report needs correction and is waiting on the team member to resubmit it."
              : "This report is still a draft - it can't be reviewed until the team member submits it."}
        </div>
      )}

      {approveError && (
        <div className="mb-6">
          <ErrorMessage message={approveError} />
        </div>
      )}

      {latestCorrection && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-medium text-amber-800">
            Correction requested by {latestCorrection.reviewer.name} &middot; {formatDateTime(latestCorrection.createdAt)}
          </p>
          <p className="mt-1 text-sm text-amber-900">{latestCorrection.comment}</p>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">
          Current Version{report.currentVersion ? ` \u00b7 Version ${report.currentVersion.versionNumber}` : ""}
        </h2>
        {report.currentVersion?.submittedAt && (
          <span className="text-xs text-slate-500">Submitted {formatDateTime(report.currentVersion.submittedAt)}</span>
        )}
      </div>

      <ReportContentSections project={report.project} content={content} />

      <div className="mt-6">
        <VersionHistorySection report={report} />
      </div>

      {showRequestChanges && (
        <RequestChangesModal onCancel={() => setShowRequestChanges(false)} onSubmit={handleRequestChanges} />
      )}
    </div>
  );
}
