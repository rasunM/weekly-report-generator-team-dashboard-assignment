"use client";

// "Tasks Completed Trend" (Feature 7, chart #2). GET /api/dashboard/tasks-trend returns real
// weekly task-completion counts across the last N weeks (dashboard.service.ts
// `getTasksCompletedTrend()` counts TaskEntry rows whose status is "completed", case-insensitive).
import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/lib/auth/AuthContext";
import { getTasksTrend } from "@/lib/api/dashboard";
import { ApiError } from "@/lib/api/client";
import type { TasksTrendPoint } from "@/types/dashboard";
import DashboardCard from "@/components/common/DashboardCard";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ErrorMessage from "@/components/common/ErrorMessage";
import EmptyState from "@/components/common/EmptyState";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: TasksTrendPoint[] };

function formatWeekLabel(weekStart: string): string {
  return new Date(weekStart).toLocaleDateString(undefined, { timeZone: "UTC", month: "short", day: "numeric" });
}

export default function TasksTrendChart() {
  const { accessToken } = useAuth();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    getTasksTrend(accessToken, { weeks: 8 })
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ status: "error", message: err instanceof ApiError ? err.message : "Could not load the trend." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return (
    <DashboardCard title="Tasks Completed Trend (Last 8 Weeks)">
      {state.status === "loading" && <LoadingSpinner label="Loading..." />}
      {state.status === "error" && <ErrorMessage message={state.message} />}
      {state.status === "ready" &&
        (state.data.every((p) => p.tasksCompleted === 0) ? (
          <EmptyState message="No completed tasks recorded in this period." />
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={state.data.map((p) => ({ ...p, label: formatWeekLabel(p.weekStart) }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="tasksCompleted" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
    </DashboardCard>
  );
}
