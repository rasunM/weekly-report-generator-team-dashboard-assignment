"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth/AuthContext";
import { getDashboardSummary } from "@/lib/api/dashboard";
import { ApiError } from "@/lib/api/client";
import type { DashboardSummary } from "@/types/dashboard";
import SummaryCards from "@/components/manager/SummaryCards";
import TeamReportsSection from "@/components/manager/TeamReportsSection";
import StatusByMemberSection from "@/components/manager/StatusByMemberSection";
import TasksTrendChart from "@/components/manager/TasksTrendChart";
import WorkloadChart from "@/components/manager/WorkloadChart";
import HoursByTypeChart from "@/components/manager/HoursByTypeChart";
import ActivityFeed from "@/components/manager/ActivityFeed";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ErrorMessage from "@/components/common/ErrorMessage";
import Button from "@/components/common/Button";
import PageHeader from "@/components/common/PageHeader";

export default function ManagerDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["MANAGER"]}>
      <ManagerDashboardContent />
    </ProtectedRoute>
  );
}

type SummaryState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: DashboardSummary };

function ManagerDashboardContent() {
  const { user, accessToken } = useAuth();
  const [summaryState, setSummaryState] = useState<SummaryState>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setSummaryState({ status: "loading" });
    getDashboardSummary(accessToken)
      .then((data) => {
        if (!cancelled) setSummaryState({ status: "ready", data });
      })
      .catch((err) => {
        if (!cancelled) {
          setSummaryState({
            status: "error",
            message: err instanceof ApiError ? err.message : "Could not load the dashboard summary.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, retryKey]);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader title="Manager Dashboard" subtitle={`Welcome back, ${user?.name}.`} />

      {summaryState.status === "loading" && <LoadingSpinner label="Loading dashboard..." />}

      {summaryState.status === "error" && (
        <div className="mb-8 flex flex-col items-start gap-3">
          <ErrorMessage message={summaryState.message} />
          <Button variant="secondary" onClick={() => setRetryKey((k) => k + 1)}>
            Retry
          </Button>
        </div>
      )}

      {summaryState.status === "ready" && (
        <div className="mb-6">
          <SummaryCards summary={summaryState.data} />
        </div>
      )}

      <div className="flex flex-col gap-6">
        <TeamReportsSection />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <StatusByMemberSection />
          <TasksTrendChart />
          <WorkloadChart />
          <HoursByTypeChart />
        </div>

        <ActivityFeed />
      </div>
    </div>
  );
}
