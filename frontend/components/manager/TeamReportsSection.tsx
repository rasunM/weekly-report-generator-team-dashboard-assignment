"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { listReports } from "@/lib/api/reports";
import { listActiveProjects } from "@/lib/api/projects";
import { listTeamMembers } from "@/lib/api/users";
import { ApiError } from "@/lib/api/client";
import type { PaginatedResult, ReportSummary } from "@/types/report";
import type { ProjectSummary } from "@/types/project";
import type { User } from "@/types/auth";
import TeamReportFilters, { EMPTY_TEAM_REPORT_FILTERS, type TeamReportFiltersState } from "./TeamReportFilters";
import TeamReportRow from "./TeamReportRow";
import DashboardCard from "@/components/common/DashboardCard";
import Pagination from "@/components/common/Pagination";
import EmptyState from "@/components/common/EmptyState";
import ErrorMessage from "@/components/common/ErrorMessage";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import Button from "@/components/common/Button";

const PAGE_SIZE = 10;

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: PaginatedResult<ReportSummary> };

export default function TeamReportsSection() {
  const { accessToken } = useAuth();
  const [filters, setFilters] = useState<TeamReportFiltersState>(EMPTY_TEAM_REPORT_FILTERS);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);
  const [members, setMembers] = useState<User[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);

  // Filter dropdown data - fetched once, independent of the report list's own loading state so a
  // slow/failed reports fetch never blocks the filters from being usable.
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
    // GET /api/reports, manager path (reports.service.ts `listForManager()`): every filter here is
    // a real server-side query param, not client-side filtering of an over-fetched list.
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

  return (
    <DashboardCard title="Team Reports">
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
              <EmptyState message="No reports match these filters." />
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
    </DashboardCard>
  );
}
