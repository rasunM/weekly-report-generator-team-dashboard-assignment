"use client";

// "Time Spent by Task Type" (Feature 7, chart #4). GET /api/dashboard/hours-by-type sums real
// HoursEntry rows across every report's current version (dashboard.service.ts `getHoursByType()`).
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/lib/auth/AuthContext";
import { getHoursByType } from "@/lib/api/dashboard";
import { ApiError } from "@/lib/api/client";
import type { HoursByTypePoint } from "@/types/dashboard";
import type { HourType } from "@/types/report";
import DashboardCard from "@/components/common/DashboardCard";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ErrorMessage from "@/components/common/ErrorMessage";
import EmptyState from "@/components/common/EmptyState";

const HOUR_LABELS: Record<HourType, string> = {
  DEVELOPMENT: "Development",
  TESTING: "Testing",
  MEETINGS: "Meetings",
  DOCUMENTATION: "Documentation",
  OTHER: "Other",
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: HoursByTypePoint[] };

export default function HoursByTypeChart() {
  const { accessToken } = useAuth();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    getHoursByType(accessToken)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ status: "error", message: err instanceof ApiError ? err.message : "Could not load hours data." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const chartData = state.status === "ready" ? state.data.map((p) => ({ ...p, label: HOUR_LABELS[p.type] })) : [];

  return (
    <DashboardCard title="Time Spent by Task Type">
      {state.status === "loading" && <LoadingSpinner label="Loading..." />}
      {state.status === "error" && <ErrorMessage message={state.message} />}
      {state.status === "ready" &&
        (state.data.length === 0 || state.data.every((p) => p.totalHours === 0) ? (
          <EmptyState message="No hours recorded yet." />
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="totalHours" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}
    </DashboardCard>
  );
}
