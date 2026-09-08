"use client";

// Read-only report view (Feature 6): loads GET /api/reports/:id and displays every section of the
// fixed report structure without any editing affordances. Ownership is enforced by the backend
// (reports.service.ts `assertAccess()` - a member can only load their own reports, a 403 surfaces
// as the load error below); an Edit button only appears when the loaded status is one the backend
// actually allows editing (DRAFT/NEEDS_CORRECTION), mirroring ReportForm.tsx's own `isLocked` rule.
//
// The 8-section report body is shared with the Manager Review page (Feature 9) via
// ReportContentSections - this component only owns the load state, header, and the correction
// banner, which differ slightly between the two contexts.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { getReport } from "@/lib/api/reports";
import { ApiError } from "@/lib/api/client";
import { formatWeekRange, formatDateTime } from "@/lib/format";
import { roleHomePath } from "@/lib/auth/roleHome";
import type { ReportDetail as ReportDetailData, ReportStatus } from "@/types/report";
import ReportContentSections from "./ReportContentSections";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ErrorMessage from "@/components/common/ErrorMessage";

const EDITABLE_STATUSES: ReportStatus[] = ["DRAFT", "NEEDS_CORRECTION"];

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ReportDetailData };

export default function ReportDetail({ reportId }: { reportId: string }) {
  const { accessToken, role } = useAuth();
  const [state, setState] = useState<LoadState>({ status: "loading" });

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
  }, [accessToken, reportId]);

  if (state.status === "loading") {
    return <LoadingSpinner label="Loading report..." />;
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <ErrorMessage message={state.message} />
        <Link href={roleHomePath(role)} className="mt-4 inline-block text-sm font-medium text-slate-900 hover:underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const report = state.data;
  const content = report.currentVersion?.content ?? null;
  // Managers can view any team report (backend: reports.service.ts `assertAccess()` only
  // restricts MEMBERs to their own reports) but must never edit report content directly - only
  // the report's own author can. Approve/Request Changes actions live on the dedicated Manager
  // Review page (/manager/reports/[id]/review, Feature 9), not here - this plain detail view stays
  // read-only-with-an-edit-button for the report's own author, same as Feature 6 shipped it.
  const isEditable = role === "MEMBER" && EDITABLE_STATUSES.includes(report.status);
  const latestCorrection = report.reviewComments.find((c) => c.action === "REQUEST_CHANGES") ?? null;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <Link href={roleHomePath(role)} className="text-xs font-medium text-slate-500 hover:text-slate-900 hover:underline">
        &larr; Back to Dashboard
      </Link>

      <div className="mb-6 mt-2 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Weekly Report</h1>
          <p className="mt-1 text-sm text-slate-500">
            {formatWeekRange(report.weekStart, report.weekEnd)}
            {role === "MANAGER" && <> &middot; {report.user.name}</>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={report.status} />
          {isEditable && (
            <Link
              href={`/reports/${report.id}/edit`}
              className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      {latestCorrection && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-medium text-amber-800">
            Manager feedback from {latestCorrection.reviewer.name} &middot; {formatDateTime(latestCorrection.createdAt)}
          </p>
          <p className="mt-1 text-sm text-amber-900">{latestCorrection.comment}</p>
        </div>
      )}

      <ReportContentSections project={report.project} content={content} />
    </div>
  );
}
