"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth/AuthContext";
import { listReports } from "@/lib/api/reports";
import { ApiError } from "@/lib/api/client";
import type { PaginatedResult, ReportStatus, ReportSummary } from "@/types/report";
import ReportHistoryRow from "@/components/reports/ReportHistoryRow";
import Select from "@/components/common/Select";
import Pagination from "@/components/common/Pagination";
import EmptyState from "@/components/common/EmptyState";
import ErrorMessage from "@/components/common/ErrorMessage";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import Button from "@/components/common/Button";
import PageHeader from "@/components/common/PageHeader";

const PAGE_SIZE = 10;

const STATUS_OPTIONS: { value: ReportStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "NEEDS_CORRECTION", label: "Needs Correction" },
  { value: "APPROVED", label: "Approved" },
];

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: PaginatedResult<ReportSummary> };

export default function ReportHistoryPage() {
  return (
    <ProtectedRoute allowedRoles={["MEMBER"]}>
      <ReportHistoryContent />
    </ProtectedRoute>
  );
}

function ReportHistoryContent() {
  const { accessToken } = useAuth();
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "">("");
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    setState({ status: "loading" });
    // Status filtering and pagination are both real query params sent to GET /api/reports - the
    // backend does the filtering and paging (reports.service.ts `listForUser()`), never the
    // frontend. It also self-scopes to the caller's own reports server-side regardless of any
    // param sent, so a Team Member can never receive another user's reports through this call.
    listReports(accessToken, { status: statusFilter || undefined, page, pageSize: PAGE_SIZE })
      .then((result) => {
        if (!cancelled) setState({ status: "ready", data: result });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof ApiError ? err.message : "Something went wrong loading your report history.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, statusFilter, page, retryKey]);

  function handleStatusChange(value: string) {
    setStatusFilter(value as ReportStatus | "");
    setPage(1);
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        title="Report History"
        subtitle="All of your weekly reports, past and present."
        action={
          <div className="w-full sm:w-48">
            <Select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              options={STATUS_OPTIONS}
            />
          </div>
        }
      />

      {state.status === "loading" && <LoadingSpinner label="Loading your reports..." />}

      {state.status === "error" && (
        <div className="flex flex-col items-start gap-3">
          <ErrorMessage message={state.message} />
          <Button variant="secondary" onClick={() => setRetryKey((k) => k + 1)}>
            Retry
          </Button>
        </div>
      )}

      {state.status === "ready" && (
        <div className="flex flex-col gap-3">
          {state.data.items.length === 0 ? (
            <EmptyState
              message={
                statusFilter ? "No reports match this filter." : "You haven't created any reports yet."
              }
            />
          ) : (
            state.data.items.map((report) => <ReportHistoryRow key={report.id} report={report} />)
          )}

          <Pagination
            page={state.data.pagination.page}
            totalPages={state.data.pagination.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
