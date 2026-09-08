"use client";

// Report Version History (Feature 10). ReportVersion rows are immutable content snapshots with no
// status of their own (prisma/schema.prisma - status lives only on Report); a new version is only
// ever created when an already-submitted version gets edited again (reports.service.ts `update()`,
// `needsNewVersion = currentVersion.submittedAt !== null`). So every version that isn't the current
// one was, by construction, submitted and then reviewed - that review action (tied via
// `reviewComments[].reportVersionId`, set to `currentVersionId` at the moment of the review call)
// is the closest real signal to a per-version "status", and is shown here instead of a fabricated
// one. Deliberately simple: version numbers + timestamps + the review comment tied to each, and a
// "View" toggle that lazy-loads that one version's content on demand - no diffing.
import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { getReportVersion } from "@/lib/api/reports";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import type { ReportDetail as ReportDetailData, ReportVersionDetail, ReviewAction } from "@/types/report";
import DetailSection from "@/components/reports/DetailSection";
import ReportContentSections from "@/components/reports/ReportContentSections";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ErrorMessage from "@/components/common/ErrorMessage";
import Button from "@/components/common/Button";

// A previous version's "status" badge reuses the real ReportStatus enum values so StatusBadge's
// existing colors/labels apply as-is - no new status vocabulary invented.
function statusForVersion(action: ReviewAction | undefined): "APPROVED" | "NEEDS_CORRECTION" | "SUBMITTED" {
  if (action === "APPROVED") return "APPROVED";
  if (action === "REQUEST_CHANGES") return "NEEDS_CORRECTION";
  return "SUBMITTED"; // a non-current version always has submittedAt set - it just has no review yet
}

type VersionLoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: ReportVersionDetail };

export default function VersionHistorySection({ report }: { report: ReportDetailData }) {
  const { accessToken } = useAuth();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loaded, setLoaded] = useState<Record<number, VersionLoadState>>({});

  const currentVersionNumber = report.currentVersion?.versionNumber ?? null;
  const previousVersions = report.versionHistory.filter((v) => v.versionNumber !== currentVersionNumber);

  function commentFor(versionId: string) {
    return report.reviewComments.find((c) => c.reportVersionId === versionId) ?? null;
  }

  async function handleToggleView(versionNumber: number) {
    if (expanded === versionNumber) {
      setExpanded(null);
      return;
    }
    setExpanded(versionNumber);
    if (!accessToken || loaded[versionNumber]?.status === "ready") return;
    setLoaded((prev) => ({ ...prev, [versionNumber]: { status: "loading" } }));
    try {
      const data = await getReportVersion(accessToken, report.id, versionNumber);
      setLoaded((prev) => ({ ...prev, [versionNumber]: { status: "ready", data } }));
    } catch (err) {
      setLoaded((prev) => ({
        ...prev,
        [versionNumber]: { status: "error", message: err instanceof ApiError ? err.message : "Could not load this version." },
      }));
    }
  }

  return (
    <DetailSection title="Previous Versions">
      {previousVersions.length === 0 ? (
        <p className="text-sm text-slate-500">
          This is the only version of this report - no earlier versions exist yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {previousVersions.map((v) => {
            const comment = commentFor(v.id);
            const isOpen = expanded === v.versionNumber;
            const loadState = loaded[v.versionNumber];
            return (
              <div key={v.id} className="rounded-md border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-slate-900">Version {v.versionNumber}</span>
                    <span className="text-xs text-slate-500">
                      Submitted {v.submittedAt ? formatDateTime(v.submittedAt) : "—"}
                    </span>
                    <StatusBadge status={statusForVersion(comment?.action)} />
                  </div>
                  <Button variant="secondary" onClick={() => handleToggleView(v.versionNumber)}>
                    {isOpen ? "Hide" : "View"}
                  </Button>
                </div>

                {comment && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-2">
                    <p className="text-xs text-slate-500">
                      {comment.action === "APPROVED" ? "Approved" : "Correction requested"} by {comment.reviewer.name} &middot;{" "}
                      {formatDateTime(comment.createdAt)}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-700">{comment.comment}</p>
                  </div>
                )}

                {isOpen && (
                  <div className="border-t border-slate-200 p-4">
                    {(!loadState || loadState.status === "loading") && <LoadingSpinner label="Loading version..." />}
                    {loadState?.status === "error" && <ErrorMessage message={loadState.message} />}
                    {loadState?.status === "ready" && (
                      <ReportContentSections project={report.project} content={loadState.data.content} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DetailSection>
  );
}
