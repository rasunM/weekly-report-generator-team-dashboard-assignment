"use client";

// "Workload by Project" (Feature 7, chart #3). GET /api/dashboard/workload-by-project returns real
// task counts grouped by project, from each report's CURRENT version only (dashboard.service.ts
// `getWorkloadByProject()`), so superseded versions don't double-count.
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/lib/auth/AuthContext";
import { getWorkloadByProject } from "@/lib/api/dashboard";
import { ApiError } from "@/lib/api/client";
import type { WorkloadByProjectPoint } from "@/types/dashboard";
import DashboardCard from "@/components/common/DashboardCard";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ErrorMessage from "@/components/common/ErrorMessage";
import EmptyState from "@/components/common/EmptyState";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: WorkloadByProjectPoint[] };

export default function WorkloadChart() {
  const { accessToken } = useAuth();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    getWorkloadByProject(accessToken)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ status: "error", message: err instanceof ApiError ? err.message : "Could not load workload data." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return (
    <DashboardCard title="Workload by Project">
      {state.status === "loading" && <LoadingSpinner label="Loading..." />}
      {state.status === "error" && <ErrorMessage message={state.message} />}
      {state.status === "ready" &&
        (state.data.length === 0 ? (
          <EmptyState message="No task data recorded yet." />
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={state.data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="projectName" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="taskCount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}
    </DashboardCard>
  );
}
