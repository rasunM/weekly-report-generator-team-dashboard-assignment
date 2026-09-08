"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth/AuthContext";
import { listReports } from "@/lib/api/reports";
import { listActiveProjects } from "@/lib/api/projects";
import { listTeamMembers } from "@/lib/api/users";
import { ApiError } from "@/lib/api/client";
import type { PaginatedResult, ReportSummary } from "@/types/report";
import type { ProjectSummary } from "@/types/project";
import type { User } from "@/types/auth";
import TeamReportFilters, { EMPTY_TEAM_REPORT_FILTERS, type TeamReportFiltersState } from "@/components/manager/TeamReportFilters";
import TeamReportRow from "@/components/manager/TeamReportRow";
import Pagination from "@/components/common/Pagination";
import EmptyState from "@/components/common/EmptyState";
import ErrorMessage from "@/components/common/ErrorMessage";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import Button from "@/components/common/Button";
import PageHeader from "@/components/common/PageHeader";

// Full-page team report browser (distinct from the small "Team Reports" widget embedded on
// /manager/dashboard - that one is a summary card; this page is the dedicated, full-list view with
// its own URL). Reuses the same TeamReportFilters/TeamReportRow components since the filtering and
// row-display requirements are identical - only the page chrome and page size differ.
//
// NOTE on "search": GET /api/reports (reports.dto.ts `listReportsQuerySchema`, verified against
// reports.controller.ts/reports.service.ts) has no free-text search/keyword param - only status,
// projectId, userId (manager-only), weekStart/weekEnd (manager-only), page, pageSize. There is
// nothing to wire a search box to, so one isn't included here per "adapt to the backend, don't
// invent endpoints."
const PAGE_SIZE = 15;

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: PaginatedResult<ReportSummary> };

export default function ManagerReportsPage() {
  return (
    <ProtectedRoute allowedRoles={["MANAGER"]}>
      <ManagerReportsContent />
    </ProtectedRoute>
  );
}

function ManagerReportsContent() {
  const { accessToken } = useAuth();
  const [filters, setFilters] = useState<TeamReportFiltersState>(EMPTY_TEAM_REPORT_FILTERS);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);
  const [members, setMembers] = useState<User[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);

  // Filter dropdown data - fetched once, independently of the report list's own load state so a
  // slow/failed reports fetch never blocks the filters from being usable (same pattern as
  // TeamReportsSection on the dashboard).
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    Promise.all([listTeamMembers(accessToken), listActiveProjects(accessToken)])
      .then(([membersResult, projectsResult]) => {
        if (cancelled) return;
        setMembers(membersResult.items);
        setProjects(projectsResult.items);
      })
      .catch(() => {
        // Non-fatal: filters just show fewer options if this fails; the report list itself still works.
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setState({ status: "loading" });
    // GET /api/reports via the manager path (reports.service.ts `listForManager()`): every filter
    // here - member, project, status, date range - is a real server-side query param, and paging
    // is server-side too. Nothing is fetched-all-then-filtered-on-the-client.
    listReports(accessToken, {
      status: filters.status || undefined,
      projectId: filters.projectId || undefined,
      userId: filters.userId || undefined,
      weekStart: filters.weekFrom || undefined,
      weekEnd: filters.weekTo || undefined,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((result) => {
        if (!cancelled) setState({ status: "ready", data: result });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof ApiError ? err.message : "Could not load team reports.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, filters, page, retryKey]);

  function handleFiltersChange(next: TeamReportFiltersState) {
    setFilters(next);
    setPage(1);
  }

  const hasFilters = Boolean(filters.userId || filters.projectId || filters.status || filters.weekFrom || filters.weekTo);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader title="Team Reports" subtitle="Every report your team has created, filterable by member, project, status, and week." />

      <div className="flex flex-col gap-4">
        <TeamReportFilters value={filters} onChange={handleFiltersChange} members={members} projects={projects} />

        {state.status === "loading" && <LoadingSpinner label="Loading team reports..." />}

        {state.status === "error" && (
          <div className="flex flex-col items-start gap-3">
            <ErrorMessage message={state.message} />
            <Button variant="secondary" onClick={() => setRetryKey((k) => k + 1)}>
              Retry
            </Button>
          </div>
        )}

        {state.status === "ready" && (
          <>
            {state.data.items.length === 0 ? (
              <EmptyState message={hasFilters ? "No reports match these filters." : "Your team hasn't created any reports yet."} />
            ) : (
              <div className="flex flex-col gap-3">
                {state.data.items.map((report) => (
                  <TeamReportRow key={report.id} report={report} />
                ))}
              </div>
            )}
            <Pagination page={state.data.pagination.page} totalPages={state.data.pagination.totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
